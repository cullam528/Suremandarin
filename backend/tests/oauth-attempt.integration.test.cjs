const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

// Real installed auth.connect controller and OAuth middleware; only provider
// HTTP exchanges are replaced. No application bootstrap or .env is loaded.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText, filename);
};
const pluginRequire = createRequire(require.resolve('@strapi/plugin-users-permissions/package.json'));
const pluginRoot = path.dirname(pluginRequire.resolve('@strapi/plugin-users-permissions/package.json'));
const installed = (name) => require(path.join(pluginRoot, 'dist/server', name)).__require();
const callback = (provider) => `https://www.suremandarin.example/api/auth/oauth/callback/${provider}`;
const nonce = (value) => value.toString(16).padStart(48, '0');

async function fixture(fn) {
  const oauth1 = installed('utils/oauth-connect/oauth1.js');
  const oauth2 = installed('utils/oauth-connect/oauth2.js');
  const previous = { strapi: global.strapi, requestToken: oauth1.requestToken, accessToken: oauth1.accessToken, exchange: oauth2.exchangeAuthorizationCode };
  const exchanges = [];
  let token = 0;
  oauth1.requestToken = async () => ({ oauth_token: `request-${++token}`, oauth_token_secret: `secret-${token}`, oauth_callback_confirmed: 'true' });
  oauth1.accessToken = async (input) => { exchanges.push(input); return { oauth_token: `access-${input.oauthToken}`, oauth_token_secret: 'access-secret' }; };
  oauth2.exchangeAuthorizationCode = async (provider, input) => { exchanges.push({ provider: provider.name, ...input }); return { access_token: `access-${input.code}` }; };
  const settings = Object.fromEntries(['google', 'linkedin', 'twitter'].map((provider) => [provider, {
    enabled: true, key: 'synthetic-client', secret: 'synthetic-secret', callback: callback(provider), scope: ['openid', 'email'],
  }]));
  const config = installed('config.js').default({ env: () => '' });
  const strapi = {
    config: { server: { url: 'https://api.suremandarin.example' }, get: (key) => key === 'api.rest.prefix' ? '/api' : undefined },
    log: { warn() {} },
    store: () => ({ get: async () => settings }),
    plugin: () => ({
      config: (key) => config[key],
      service: () => ({ buildRedirectUri: (provider) => `https://api.suremandarin.example/api/connect/${provider}/callback` }),
    }),
  };
  global.strapi = strapi;
  const plugin = {
    controllers: { auth: installed('controllers/auth.js'), user: { create() {}, update() {}, me() {} } },
    services: { user: () => ({ add() {} }), providers: () => ({}), 'providers-registry': () => ({ run() {} }) },
  };
  require('../src/extensions/users-permissions/strapi-server.ts').default(plugin);
  const controller = plugin.controllers.auth({ strapi });
  async function request(session, provider, isCallback, query = {}) {
    const ctx = {
      session, state: {}, query,
      request: { url: `/api/connect/${provider}${isCallback ? '/callback' : ''}?${new URLSearchParams(query)}` },
      redirect(url) { this.location = url; },
      throw(status, message) { const error = new Error(message); error.status = status; throw error; },
    };
    await controller.connect(ctx, () => { throw new Error('Unexpected middleware fallthrough'); });
    return { ctx, url: new URL(ctx.location) };
  }
  const start = (session, provider, attempt, extra = '') => request(session, provider, false, attempt ? {
    callback: `${callback(provider)}?oauthAttempt=${attempt}${extra}`,
  } : {});
  try { await fn({ request, start, exchanges, settings }); } finally {
    global.strapi = previous.strapi;
    oauth1.requestToken = previous.requestToken;
    oauth1.accessToken = previous.accessToken;
    oauth2.exchangeAuthorizationCode = previous.exchange;
  }
}

test('same-provider overlapping flows retain their own callback attempt and native state', async () => fixture(async (h) => {
  const session = {};
  const a = await h.start(session, 'google', nonce(1));
  const b = await h.start(session, 'google', nonce(2));
  assert.equal(a.url.origin, 'https://accounts.google.com');
  assert.equal(a.url.searchParams.has('oauthAttempt'), false, 'never rewrite external authorization URLs');
  for (const [flow, attempt, code] of [[a, nonce(1), 'code-a'], [b, nonce(2), 'code-b']]) {
    const result = await h.request(session, 'google', true, { state: flow.url.searchParams.get('state'), code });
    assert.equal(result.url.searchParams.get('oauthAttempt'), attempt);
    assert.equal(result.url.searchParams.get('access_token'), `access-${code}`);
  }
  assert.equal(h.exchanges.length, 2);
}));

test('different providers and OAuth1 request tokens remain isolated in reverse completion order', async () => fixture(async (h) => {
  const session = {};
  const google = await h.start(session, 'google', nonce(3));
  const linkedin = await h.start(session, 'linkedin', nonce(4));
  const twitter = await h.start(session, 'twitter', nonce(5));
  const result = await h.request(session, 'twitter', true, { oauth_token: twitter.url.searchParams.get('oauth_token'), oauth_verifier: 'verifier' });
  assert.equal(result.url.searchParams.get('oauthAttempt'), nonce(5));
  assert.match(result.url.searchParams.get('access_token'), /^access-request-/);
  for (const [provider, flow, attempt] of [['linkedin', linkedin, nonce(4)], ['google', google, nonce(3)]]) {
    const done = await h.request(session, provider, true, { state: flow.url.searchParams.get('state'), code: provider });
    assert.equal(done.url.searchParams.get('oauthAttempt'), attempt);
    assert.equal(done.url.searchParams.get('access_token'), `access-${provider}`);
  }
  assert.equal(h.exchanges[0].oauthTokenCredential, 'secret-1');
}));

test('invalid and cancelled callbacks cannot consume another attempt; cancellation is state-bound', async () => fixture(async (h) => {
  const session = {};
  const a = await h.start(session, 'google', nonce(6));
  const b = await h.start(session, 'linkedin', nonce(7));
  for (const query of [{ code: 'wrong', state: 'unknown' }, { error: 'access_denied' }, { code: 'wrong', state: b.url.searchParams.get('state') }]) {
    const bad = await h.request(session, 'google', true, query);
    assert.equal(bad.url.searchParams.get('oauthAttempt'), null);
    assert.equal(bad.url.searchParams.get('access_token'), null);
    assert.equal(bad.url.searchParams.get('error'), 'oauth_error');
  }
  assert.equal(h.exchanges.length, 0);
  const cancelled = await h.request(session, 'google', true, { error: 'access_denied', state: a.url.searchParams.get('state') });
  assert.equal(cancelled.url.searchParams.get('oauthAttempt'), nonce(6));
  const done = await h.request(session, 'linkedin', true, { code: 'linkedin', state: b.url.searchParams.get('state') });
  assert.equal(done.url.searchParams.get('oauthAttempt'), nonce(7));
}));

test('legacy clients and attempt clients preserve each other’s grant context', async () => fixture(async (h) => {
  const session = {};
  const legacy = await h.start(session, 'google');
  const attempt = await h.start(session, 'linkedin', nonce(8));
  const legacyDone = await h.request(session, 'google', true, { code: 'legacy', state: legacy.url.searchParams.get('state') });
  assert.equal(legacyDone.url.searchParams.get('access_token'), 'access-legacy');
  assert.equal(legacyDone.url.searchParams.get('oauthAttempt'), null);
  const done = await h.request(session, 'linkedin', true, { code: 'new', state: attempt.url.searchParams.get('state') });
  assert.equal(done.url.searchParams.get('oauthAttempt'), nonce(8));
}));

test('lost concurrent cookie snapshots fail closed and leave the winning attempt usable', async () => fixture(async (h) => {
  const oldCookie = {};
  const aCookie = structuredClone(oldCookie);
  const bCookie = structuredClone(oldCookie);
  const a = await h.start(aCookie, 'google', nonce(9));
  const b = await h.start(bCookie, 'google', nonce(10));
  // Browser retained response B's complete cookie, losing A's parallel write.
  const bad = await h.request(bCookie, 'google', true, { state: a.url.searchParams.get('state'), code: 'a' });
  assert.equal(bad.url.searchParams.get('oauthAttempt'), null);
  assert.equal(h.exchanges.length, 0);
  const good = await h.request(bCookie, 'google', true, { state: b.url.searchParams.get('state'), code: 'b' });
  assert.equal(good.url.searchParams.get('oauthAttempt'), nonce(10));
  assert.equal(good.url.searchParams.get('access_token'), 'access-b');
}));

test('callback query overrides cannot switch attempt; no arbitrary callback query is forwarded', async () => fixture(async (h) => {
  const session = {};
  const a = await h.start(session, 'google', nonce(11), '&ref=untrusted&anything=else');
  const result = await h.request(session, 'google', true, {
    state: a.url.searchParams.get('state'), code: 'a', callback: `${callback('google')}?oauthAttempt=${nonce(12)}`,
  });
  assert.equal(result.url.searchParams.get('oauthAttempt'), null);
  assert.equal(result.url.searchParams.get('access_token'), null);
  assert.equal(h.exchanges.length, 0);
  const done = await h.request(session, 'google', true, { state: a.url.searchParams.get('state'), code: 'a' });
  assert.equal(done.url.searchParams.get('oauthAttempt'), nonce(11));
  assert.equal(done.url.searchParams.has('ref'), false);
  assert.equal(done.url.searchParams.has('anything'), false);
}));

test('attempt state is bounded in count, cookie size and age; expired callbacks cannot borrow active state', async () => fixture(async (h) => {
  const session = {};
  const attempts = [];
  for (let index = 20; index < 26; index += 1) attempts.push(await h.start(session, 'google', nonce(index)));
  assert.equal(Object.keys(session.smOAuthAttempts).length, 3);
  assert.ok(Buffer.byteLength(JSON.stringify(session), 'utf8') <= 2600);
  const oldest = await h.request(session, 'google', true, { state: attempts[0].url.searchParams.get('state'), code: 'old' });
  assert.equal(oldest.url.searchParams.get('oauthAttempt'), null);
  assert.equal(h.exchanges.length, 0);
  const originalNow = Date.now;
  try {
    const now = originalNow(); Date.now = () => now + 601000;
    const fresh = await h.start(session, 'google', nonce(26));
    const expired = await h.request(session, 'google', true, { state: attempts.at(-1).url.searchParams.get('state'), code: 'expired' });
    assert.equal(expired.url.searchParams.get('oauthAttempt'), null);
    assert.equal(expired.url.searchParams.get('access_token'), null);
    const freshDone = await h.request(session, 'google', true, { state: fresh.url.searchParams.get('state'), code: 'fresh' });
    assert.equal(freshDone.url.searchParams.get('oauthAttempt'), nonce(26));
  } finally { Date.now = originalNow; }
}));

test('the real koa-session serialization stays below cookie limits alongside a legacy session', async () => fixture(async (h) => {
  const strapiRequire = createRequire(require.resolve('@strapi/strapi/package.json'));
  const coreRequire = createRequire(strapiRequire.resolve('@strapi/core/package.json'));
  const koaRoot = path.dirname(coreRequire.resolve('koa-session'));
  const { Session } = require(path.join(koaRoot, 'session.js'));
  const session = new Session({ ctx: { sessionOptions: { maxAge: 86400000 } } });
  session.unrelated = 'reserved-session-data-'.repeat(60);
  const legacy = await h.start(session, 'google');
  const attempts = [];
  for (let index = 30; index < 35; index += 1) attempts.push(await h.start(session, 'twitter', nonce(index)));
  const cookie = Buffer.from(JSON.stringify({ ...session.toJSON(), _expire: Date.now() + 86400000, _maxAge: 86400000 })).toString('base64');
  assert.ok(Buffer.byteLength(cookie, 'utf8') < 3900, 'leave cookie header and signature margin');
  const completed = await h.request(session, 'twitter', true, { oauth_token: attempts.at(-1).url.searchParams.get('oauth_token'), oauth_verifier: 'verified' });
  assert.equal(completed.url.searchParams.get('oauthAttempt'), nonce(34));
  const legacyDone = await h.request(session, 'google', true, { state: legacy.url.searchParams.get('state'), code: 'legacy' });
  assert.equal(legacyDone.url.searchParams.get('access_token'), 'access-legacy');
}));

test('invalid Twitter tokens and repeated callbacks never consume the remaining request secret', async () => fixture(async (h) => {
  const session = {};
  const a = await h.start(session, 'twitter', nonce(40));
  const b = await h.start(session, 'twitter', nonce(41));
  const wrong = await h.request(session, 'twitter', true, { oauth_token: 'unknown', oauth_verifier: 'verifier' });
  assert.equal(wrong.url.searchParams.get('oauthAttempt'), null);
  assert.equal(h.exchanges.length, 0);
  const queryA = { oauth_token: a.url.searchParams.get('oauth_token'), oauth_verifier: 'verifier' };
  const done = await h.request(session, 'twitter', true, queryA);
  assert.equal(done.url.searchParams.get('oauthAttempt'), nonce(40));
  const replay = await h.request(session, 'twitter', true, queryA);
  assert.equal(replay.url.searchParams.get('access_token'), null);
  const doneB = await h.request(session, 'twitter', true, { oauth_token: b.url.searchParams.get('oauth_token'), oauth_verifier: 'verifier' });
  assert.equal(doneB.url.searchParams.get('oauthAttempt'), nonce(41));
  assert.deepEqual(h.exchanges.map((call) => call.oauthTokenCredential), ['secret-1', 'secret-2']);
}));

test('default origin/path validation remains enforced and malformed or duplicate attempts are refused', async () => fixture(async (h) => {
  for (const target of [
    `https://attacker.example/api/auth/oauth/callback/google?oauthAttempt=${nonce(50)}`,
    `https://www.suremandarin.example/other?oauthAttempt=${nonce(50)}`,
  ]) await assert.rejects(() => h.request({}, 'google', false, { callback: target }), /Forbidden callback/);
  for (const suffix of ['bad', `${nonce(50)}&oauthAttempt=${nonce(51)}`]) {
    const result = await h.request({}, 'google', false, { callback: `${callback('google')}?oauthAttempt=${suffix}` });
    assert.equal(result.url.searchParams.get('error'), 'oauth_error');
    assert.equal(result.url.searchParams.get('oauthAttempt'), null);
  }
  const session = {};
  const first = await h.start(session, 'google', nonce(52));
  const duplicate = await h.start(session, 'google', nonce(52));
  assert.equal(duplicate.url.searchParams.get('error'), 'oauth_error');
  const done = await h.request(session, 'google', true, { state: first.url.searchParams.get('state'), code: 'first' });
  assert.equal(done.url.searchParams.get('oauthAttempt'), nonce(52));
}));
