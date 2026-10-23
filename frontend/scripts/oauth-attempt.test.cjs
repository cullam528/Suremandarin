/* eslint-disable @typescript-eslint/no-require-imports -- Real OAuth routes, synthetic browser cookies and transport. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const origin = 'https://website.example.test';
const prefix = 'suremandarin_oauth_';

function browser() {
  const jar = new Map(), requests = [], sessions = [];
  function load(relativePath) {
    const filename = path.join(__dirname, '../src', relativePath);
    const exports = {};
    vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText, {
      exports, URL, URLSearchParams, Buffer, process: { env: { NODE_ENV: 'production' } },
      require(name) {
        if (name === 'next/server') return { NextResponse };
        if (name === 'node:crypto') return require('node:crypto');
        if (name === '@/lib/oauth-context') return load('lib/oauth-context.ts');
        if (name === '@/lib/auth') return { STRAPI_URL: 'https://cms.example.test', setAuthCookie: async (token) => sessions.push(token) };
        if (name === 'next/headers') return { cookies: async () => ({
          get: (name) => jar.has(name) ? { name, value: jar.get(name) } : undefined,
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          delete: (name) => jar.delete(name),
        }) };
        throw new Error(`Unexpected dependency: ${name}`);
      },
      fetch: async (url) => { requests.push(new URL(url)); return { ok: true, json: async () => ({ jwt: 'synthetic' }) }; },
    }, { filename });
    return exports;
  }
  const start = load('app/api/auth/oauth/[provider]/route.ts');
  const callback = load('app/api/auth/oauth/callback/[provider]/route.ts');
  return {
    jar, requests, sessions,
    async start(provider, ref = 'INVITER_A') {
      const response = await start.GET(new Request(`${origin}/api/auth/oauth/${provider}?mode=register&ref=${ref}`), { params: Promise.resolve({ provider }) });
      for (const cookie of response.cookies.getAll()) {
        if (cookie.maxAge === 0 || cookie.expires?.getTime() === 0) jar.delete(cookie.name);
        else jar.set(cookie.name, cookie.value);
      }
      const upstream = new URL(response.headers.get('location'));
      const callbackUrl = upstream.searchParams.get('callback');
      return { response, callbackUrl, attempt: callbackUrl ? new URL(callbackUrl).searchParams.get('oauthAttempt') : undefined };
    },
    callback(provider, attempt, query = 'access_token=synthetic') {
      return callback.GET(new Request(`${origin}/api/auth/oauth/callback/${provider}?${query}${attempt ? `&oauthAttempt=${attempt}` : ''}`), { params: Promise.resolve({ provider }) });
    },
  };
}

for (const providers of [['google', 'linkedin'], ['google', 'google']]) {
  test(`interleaved ${providers.join('/')} attempts retain their own invitation until consumed`, async () => {
    const app = browser();
    const first = await app.start(providers[0], 'INVITER_A');
    const second = await app.start(providers[1], 'INVITER_B');
    assert.match(first.attempt ?? '', /^[a-f0-9]{48}$/);
    assert.notEqual(first.attempt, second.attempt);
    await app.callback(providers[0], first.attempt);
    await app.callback(providers[1], second.attempt);
    assert.deepEqual(app.requests.map((url) => url.searchParams.get('referredByCode')), ['INVITER_A', 'INVITER_B']);
    assert.ok(app.requests.every((url) => !url.searchParams.has('oauthAttempt')));
    assert.equal(app.jar.size, 0);
  });
}

test('missing, malformed and unknown attempt IDs never exchange a provider token or create a member', async () => {
  for (const attempt of [undefined, 'malformed', 'f'.repeat(48)]) {
    const app = browser();
    await app.start('google');
    const response = await app.callback('google', attempt);
    assert.equal(app.requests.length, 0);
    assert.equal(app.sessions.length, 0);
    assert.equal(new URL(response.headers.get('location')).searchParams.get('oauth'), 'failed');
    assert.equal(app.jar.size, 1, 'An unrelated attempt remains available');
  }
});

test('wrong-provider callback preserves the correct attempt and fails before token exchange', async () => {
  const app = browser();
  const { attempt } = await app.start('google');
  await app.callback('linkedin', attempt);
  assert.equal(app.requests.length, 0);
  assert.equal(app.jar.size, 1);
  await app.callback('google', attempt);
  assert.equal(app.requests[0].searchParams.get('referredByCode'), 'INVITER_A');
});

test('expired and replayed attempts fail closed without losing another active invitation', async () => {
  const app = browser();
  const first = await app.start('google');
  const second = await app.start('linkedin', 'INVITER_B');
  const cookieName = `${prefix}${first.attempt}`;
  const context = JSON.parse(Buffer.from(app.jar.get(cookieName), 'base64url').toString());
  context.expiresAt = Date.now() - 1;
  app.jar.set(cookieName, Buffer.from(JSON.stringify(context)).toString('base64url'));
  await app.callback('google', first.attempt);
  assert.equal(app.requests.length, 0);
  await app.callback('linkedin', second.attempt);
  await app.callback('linkedin', second.attempt);
  assert.equal(app.requests.length, 1);
  assert.equal(app.requests[0].searchParams.get('referredByCode'), 'INVITER_B');
});

test('new OAuth starts keep at most three attempt cookies and evicted attempts fail safely', async () => {
  const app = browser();
  const first = await app.start('google');
  for (let index = 0; index < 4; index += 1) await app.start('google', `INVITER_${index}`);
  assert.equal(app.jar.size, 3);
  await app.callback('google', first.attempt);
  assert.equal(app.requests.length, 0);
});
