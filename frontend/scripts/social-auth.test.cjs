/* eslint-disable @typescript-eslint/no-require-imports -- Isolated OAuth tests with synthetic credentials and no network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { NextResponse } = require('next/server');

function load(relativePath, imports, globals = {}) {
  const filename = path.join(__dirname, '../src', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, URL, URLSearchParams, Buffer,
    process: { env: { NODE_ENV: 'production' } },
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
    ...globals,
  }, { filename });
  return exports;
}

const origin = 'https://website.example.test';
const backend = 'https://cms.example.test';
const params = (provider) => ({ params: Promise.resolve({ provider }) });
const context = { locale: 'zh', mode: 'register', ref: 'TEST123', refName: 'Test Inviter', source: 'website' };
const contextCookie = 'suremandarin_oauth_context';

for (const provider of ['google', 'linkedin', 'twitter']) {
  test(`${provider} starts OAuth at the backend and retains bilingual registration context`, async () => {
    const { GET } = load('app/api/auth/oauth/[provider]/route.ts', {
      'next/server': { NextResponse }, '@/lib/auth': { STRAPI_URL: backend },
    });
    const response = await GET(new Request(`${origin}/api/auth/oauth/${provider}?${new URLSearchParams(context)}`), params(provider));
    assert.equal(response.headers.get('location'), `${backend}/api/connect/${provider}`);
    const cookie = response.cookies.get(contextCookie);
    assert.deepEqual(JSON.parse(Buffer.from(cookie.value, 'base64url').toString()), context);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.secure, true);
    assert.equal(cookie.sameSite, 'lax');
  });
}

test('retired Facebook and unsupported providers cannot start website OAuth', async () => {
  const { GET } = load('app/api/auth/oauth/[provider]/route.ts', {
    'next/server': { NextResponse }, '@/lib/auth': { STRAPI_URL: backend },
  });
  for (const provider of ['facebook', 'apple', 'unknown']) {
    const response = await GET(new Request(`${origin}/api/auth/oauth/${provider}`), params(provider));
    assert.equal(response.status, 404);
    assert.equal(response.cookies.get(contextCookie), undefined);
  }
});

function callbackHarness({ result = { jwt: 'synthetic-session' }, ok = true, failure, invalidJson = false } = {}) {
  const sessions = [], requests = [], deleted = [];
  const { GET } = load('app/api/auth/oauth/callback/[provider]/route.ts', {
    'next/server': { NextResponse },
    'next/headers': { cookies: async () => ({
      get: () => ({ value: Buffer.from(JSON.stringify(context)).toString('base64url') }),
      delete: (name) => deleted.push(name),
    }) },
    '@/lib/auth': { STRAPI_URL: backend, setAuthCookie: async (token) => sessions.push(token) },
  }, {
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (failure) throw new Error('Synthetic connection failure');
      return { ok, json: async () => { if (invalidJson) throw new SyntaxError('Synthetic invalid JSON'); return result; } };
    },
  });
  return { GET, sessions, requests, deleted };
}

for (const provider of ['google', 'linkedin', 'twitter']) {
  test(`${provider} completes its callback through Strapi and keeps the requested language`, async () => {
    const harness = callbackHarness();
    const response = await harness.GET(new Request(`${origin}/api/auth/oauth/callback/${provider}?access_token=synthetic-access`), params(provider));
    assert.equal(harness.requests[0].url, `${backend}/api/auth/${provider}/callback?access_token=synthetic-access`);
    assert.equal(harness.requests[0].options.cache, 'no-store');
    assert.deepEqual(harness.sessions, ['synthetic-session']);
    assert.deepEqual(harness.deleted, [contextCookie]);
    assert.equal(response.headers.get('location'), `${origin}/zh/account/profile`);
  });
}

for (const [name, options, query, reason, requestCount] of [
  ['cancelled authorization', {}, 'error=access_denied', 'cancelled', 0],
  ['missing email', { ok: false, result: { error: { message: 'LinkedIn did not return an email address.' } } }, '', 'missing_email', 1],
  ['existing account', { ok: false, result: { error: { message: 'Email is already taken.' } } }, '', 'account_exists', 1],
  ['invalid upstream JSON', { invalidJson: true }, '', 'failed', 1],
  ['missing session', { result: {} }, '', 'failed', 1],
  ['network failure', { failure: true }, '', 'failed', 1],
]) {
  test(`LinkedIn ${name} returns safely to registration without creating a session`, async () => {
    const harness = callbackHarness(options);
    const response = await harness.GET(new Request(`${origin}/api/auth/oauth/callback/linkedin?${query}`), params('linkedin'));
    const location = new URL(response.headers.get('location'));
    assert.equal(location.pathname, '/zh/register');
    assert.equal(location.searchParams.get('oauth'), reason);
    assert.equal(location.searchParams.get('ref'), context.ref);
    assert.equal(location.searchParams.get('refName'), context.refName);
    assert.deepEqual(harness.sessions, []);
    assert.equal(harness.requests.length, requestCount);
  });
}

test('retired Facebook callbacks cannot create a website session', async () => {
  const harness = callbackHarness();
  const response = await harness.GET(new Request(`${origin}/api/auth/oauth/callback/facebook?access_token=synthetic-access`), params('facebook'));
  assert.equal(new URL(response.headers.get('location')).searchParams.get('oauth'), 'unsupported');
  assert.equal(harness.requests.length, 0);
  assert.equal(harness.sessions.length, 0);
});

for (const locale of ['en', 'zh']) for (const mode of ['login', 'register']) {
  test(`${locale} ${mode} renders Google, LinkedIn and X (not Facebook)`, () => {
    const { AuthForm } = load('components/auth/AuthForm.tsx', {
      'react': React,
      'react/jsx-runtime': require('react/jsx-runtime'),
      'next/image': require('next/image'),
      'next/link': { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) },
      'next/navigation': { useRouter: () => ({}) },
      'lucide-react': require('lucide-react'),
      '@/lib/auth-request': {},
      './PuzzleCaptcha': { PuzzleCaptcha: () => null },
    });
    const html = renderToStaticMarkup(React.createElement(AuthForm, { locale, mode }));
    for (const provider of ['google', 'linkedin', 'twitter']) {
      assert.ok(html.includes(`/api/auth/oauth/${provider}?locale=${locale}&amp;mode=${mode}`));
    }
    assert.match(html, />LinkedIn<\/a>/);
    assert.doesNotMatch(html, /facebook/i);
  });
}
