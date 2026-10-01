const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

// Compile the actual backend implementation; all requests and database calls are mocked.
const root = path.join(__dirname, '..');
const compile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const adapterSource = compile(fs.readFileSync(path.join(root, 'src/utils/linkedin-auth.ts'), 'utf8'));
const validProfile = (overrides = {}) => ({
  sub: 'synthetic-linkedin-subject', name: 'Jane Example', email: 'Jane@Example.com',
  email_verified: true, ...overrides,
});

function adapter({ profile = validProfile(), ok = true, jsonError, fetchError } = {}) {
  const calls = [];
  const signal = { synthetic: 'timeout-signal' };
  const sandbox = {
    exports: {},
    AbortSignal: { timeout(milliseconds) { assert.equal(milliseconds, 10_000); return signal; } },
    async fetch(url, options) {
      calls.push({ url, options });
      if (fetchError) throw fetchError;
      return { ok, async json() { if (jsonError) throw jsonError; return profile; } };
    },
  };
  vm.runInNewContext(adapterSource, sandbox);
  return { ...sandbox.exports, calls, signal };
}

test('LinkedIn uses OIDC userinfo with a bounded Bearer request and normalized member fields', async () => {
  const a = adapter();
  const member = await a.linkedinAuthCallback({ accessToken: 'synthetic-access-token' });
  assert.deepEqual(JSON.parse(JSON.stringify(member)), {
    username: 'Jane Example', email: 'jane@example.com', fullName: 'Jane Example',
    displayName: 'Jane Example', registrationSource: 'linkedin', registrationPlatform: 'web',
  });
  assert.equal(a.calls.length, 1);
  assert.equal(a.calls[0].url, 'https://api.linkedin.com/v2/userinfo');
  assert.equal(a.calls[0].options.headers.Authorization, 'Bearer synthetic-access-token');
  assert.equal(a.calls[0].options.headers.Accept, 'application/json');
  assert.equal(a.calls[0].options.signal, a.signal);
  assert.equal(a.calls[0].options.redirect, 'error', 'Bearer credentials must not follow a redirect');
  assert.equal(member.sub, undefined, 'Do not add unconfigured user-model fields');
});

test('missing access tokens fail before fetching', async () => {
  for (const accessToken of [undefined, null, '', '   ', 123]) {
    const a = adapter();
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken }), /access token is missing/);
    assert.equal(a.calls.length, 0);
  }
});

test('HTTP errors and malformed profile JSON fail with safe messages', async () => {
  for (const options of [
    { ok: false, profile: { message: 'sensitive-provider-diagnostic' } },
    { jsonError: new SyntaxError('secret response fragment') },
    { profile: null }, { profile: [] }, { profile: 'unexpected' },
  ]) {
    const a = adapter(options);
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken: 'synthetic' }), (error) => {
      assert.match(error.message, /could not verify|invalid profile/);
      assert.doesNotMatch(error.message, /sensitive|secret/);
      return true;
    });
  }
});

test('network errors and timeouts fail safely without disclosing request credentials', async () => {
  for (const name of ['TypeError', 'TimeoutError', 'AbortError']) {
    const fetchError = new Error('secret-bearer-diagnostic');
    fetchError.name = name;
    const a = adapter({ fetchError });
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken: 'synthetic' }), /Unable to contact LinkedIn/);
  }
});

test('a usable subject and real email are required; no fabricated email is returned', async () => {
  for (const sub of [undefined, null, '', ' ', 123]) {
    const a = adapter({ profile: validProfile({ sub }) });
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken: 'synthetic' }), /valid account identifier/);
  }
  for (const email of [undefined, null, '', ' ', 123, 'no-at-sign', 'one@@example.com', 'two words@example.com']) {
    const a = adapter({ profile: validProfile({ email }) });
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken: 'synthetic' }), /did not return an email address/);
  }
});

test('unverified or malformed verification claims are rejected, while an omitted optional claim is supported', async () => {
  for (const email_verified of [false, 'false', 'true', 0, 1, null]) {
    const a = adapter({ profile: validProfile({ email_verified }) });
    await assert.rejects(() => a.linkedinAuthCallback({ accessToken: 'synthetic' }), /not verified/);
  }
  const a = adapter({ profile: validProfile({ email_verified: undefined }) });
  assert.equal((await a.linkedinAuthCallback({ accessToken: 'synthetic' })).email, 'jane@example.com');
});

test('name selection supports given/family names, email-prefix fallback and bounded strings', async () => {
  const cases = [
    [{ name: '  Jessica Li  ' }, 'Jessica Li'],
    [{ name: '', given_name: ' Jane ', family_name: ' Example ' }, 'Jane Example'],
    [{ name: {}, given_name: undefined, family_name: null }, 'jane'],
    [{ name: 'a'.repeat(300) }, 'a'.repeat(255)],
  ];
  for (const [overrides, expected] of cases) {
    const a = adapter({ profile: validProfile(overrides) });
    const member = await a.linkedinAuthCallback({ accessToken: 'synthetic' });
    assert.equal(member.username, expected);
    assert.equal(member.fullName, expected);
    assert.equal(member.displayName, expected);
  }
});

// Extract only the real configuration function, without executing Strapi bootstrap/seeding.
const indexSource = fs.readFileSync(path.join(root, 'src/index.ts'), 'utf8');
const ast = ts.createSourceFile('index.ts', indexSource, ts.ScriptTarget.Latest, true);
const configureDeclaration = ast.statements.find((node) => ts.isFunctionDeclaration(node)
  && node.name?.text === 'configureSocialProviders');
assert(configureDeclaration);
const configureSource = compile(configureDeclaration.getText(ast)
  + '\nexports.configureSocialProviders = configureSocialProviders;');

async function configure(initial, env = {}) {
  const writes = [];
  const registry = new Map();
  const linkedinCallback = async () => ({ synthetic: true });
  const sandbox = {
    exports: {}, process: { env }, LINKEDIN_SCOPES: ['openid', 'profile', 'email'],
    linkedinAuthCallback: linkedinCallback,
  };
  vm.runInNewContext(configureSource, sandbox);
  const strapi = {
    store(options) {
      assert.deepEqual(JSON.parse(JSON.stringify(options)), { type: 'plugin', name: 'users-permissions' });
      return {
        async get({ key }) { assert.equal(key, 'grant'); return structuredClone(initial); },
        async set({ key, value }) { assert.equal(key, 'grant'); writes.push(value); },
      };
    },
    plugin(name) {
      assert.equal(name, 'users-permissions');
      return { service(service) {
        assert.equal(service, 'providers-registry');
        return { add(provider, value) { registry.set(provider, value); } };
      } };
    },
    db: new Proxy({}, { get() { throw new Error('Configuration must not modify member records'); } }),
  };
  await sandbox.exports.configureSocialProviders(strapi);
  assert.equal(writes.length, 1);
  return { grant: writes[0], registry, linkedinCallback };
}

test('env configuration enables LinkedIn OIDC, disables legacy Facebook and preserves Google/X behavior', async () => {
  const existing = { facebook: { enabled: true, key: 'old-facebook-key', secret: 'old-facebook-secret' }, apple: { enabled: true } };
  const { grant, registry, linkedinCallback } = await configure(existing, {
    FRONTEND_URL: 'https://www.suremandarin.com/',
    LINKEDIN_CLIENT_ID: 'synthetic-linkedin-client', LINKEDIN_CLIENT_SECRET: 'synthetic-linkedin-secret',
    GOOGLE_CLIENT_ID: 'synthetic-google-client', GOOGLE_CLIENT_SECRET: 'synthetic-google-secret',
    X_CONSUMER_KEY: 'synthetic-x-client', X_CONSUMER_SECRET: 'synthetic-x-secret',
    FACEBOOK_APP_ID: 'retired-facebook-client', FACEBOOK_APP_SECRET: 'retired-facebook-secret',
  });
  assert.equal(grant.linkedin.enabled, true);
  assert.equal(grant.linkedin.key, 'synthetic-linkedin-client');
  assert.equal(grant.linkedin.secret, 'synthetic-linkedin-secret');
  assert.deepEqual(Array.from(grant.linkedin.scope), ['openid', 'profile', 'email']);
  assert.equal(grant.linkedin.callback, 'https://www.suremandarin.com/api/auth/oauth/callback/linkedin');
  assert.equal(grant.facebook.enabled, false);
  assert.equal(grant.facebook.key, existing.facebook.key, 'Retired settings are preserved without enabling login');
  assert.equal(grant.apple, undefined);
  assert.deepEqual(Array.from(grant.google.scope), ['openid', 'email', 'profile']);
  assert.equal(grant.google.callback, 'https://www.suremandarin.com/api/auth/oauth/callback/google');
  assert.equal(grant.twitter.key, 'synthetic-x-client');
  assert.equal(grant.twitter.secret, 'synthetic-x-secret');
  assert.equal(grant.twitter.callback, 'https://www.suremandarin.com/api/auth/oauth/callback/twitter');
  assert.equal(grant.twitter.scope, undefined);
  assert.equal(registry.get('linkedin').authCallback, linkedinCallback);
  assert.equal(typeof registry.get('google').authCallback, 'function');
  assert.equal(registry.has('twitter'), false, 'Keep Strapi’s existing X adapter unchanged');
  assert.equal(registry.has('facebook'), false);
});

test('manually saved LinkedIn credentials are retained and upgraded even when env credentials are absent', async () => {
  const google = { enabled: true, key: 'manual-google', customSetting: true };
  const twitter = { enabled: false, key: 'manual-twitter', customSetting: true };
  const { grant, registry, linkedinCallback } = await configure({
    google, twitter,
    linkedin: { enabled: true, key: 'manual-linkedin', secret: 'manual-secret', scope: ['r_liteprofile', 'r_emailaddress'], callback: 'old-callback', customSetting: true },
  }, { FRONTEND_URL: 'https://www.suremandarin.com' });
  assert.equal(grant.linkedin.enabled, true);
  assert.equal(grant.linkedin.key, 'manual-linkedin');
  assert.equal(grant.linkedin.secret, 'manual-secret');
  assert.equal(grant.linkedin.customSetting, true);
  assert.deepEqual(Array.from(grant.linkedin.scope), ['openid', 'profile', 'email']);
  assert.equal(grant.linkedin.callback, 'https://www.suremandarin.com/api/auth/oauth/callback/linkedin');
  assert.deepEqual(grant.google, google);
  assert.deepEqual(grant.twitter, twitter);
  assert.equal(registry.get('linkedin').authCallback, linkedinCallback);
  assert.equal(registry.has('google'), false, 'Existing Google registration conditions stay unchanged');
});

test('missing or partial env credentials do not enable an unconfigured provider; adapter remains available for admin setup', async () => {
  for (const initial of [{}, { linkedin: { enabled: false, key: 'saved-client', secret: 'saved-secret' } }]) {
    const { grant, registry } = await configure(initial, { LINKEDIN_CLIENT_ID: 'partial-env-only' });
    assert.equal(grant.linkedin.enabled, false);
    assert.equal(grant.linkedin.key, initial.linkedin?.key);
    assert.equal(grant.facebook.enabled, false);
    assert.equal(typeof registry.get('linkedin').authCallback, 'function');
    assert.equal(grant.linkedin.callback, 'http://localhost:3010/api/auth/oauth/callback/linkedin');
  }
});

// Exercise the installed Strapi service itself, so account behavior is not reimplemented in tests.
const providersPath = path.join(root, 'node_modules/@strapi/plugin-users-permissions/dist/server/services/providers.js');
const providerRequire = createRequire(fs.realpathSync(providersPath));
function strapiConnect({ members = [], profile = validProfile() } = {}) {
  const writes = [];
  const a = adapter({ profile });
  const serviceExports = {};
  const sandbox = {
    exports: serviceExports,
    require(name) {
      if (name === 'lodash') return providerRequire('lodash');
      if (name === 'url-join') return providerRequire('url-join');
      assert.equal(name, '../utils/index.js');
      return { __require: () => ({
        getService(name) {
          assert.equal(name, 'providers-registry');
          return { run({ provider, accessToken }) { assert.equal(provider, 'linkedin'); return a.linkedinAuthCallback({ accessToken }); } };
        },
        async findValidUsername(name) { return name; },
      }) };
    },
  };
  vm.runInNewContext(fs.readFileSync(providersPath, 'utf8'), sandbox);
  const strapi = {
    store({ key }) { return { async get() {
      if (key === 'grant') return { linkedin: { enabled: true } };
      assert.equal(key, 'advanced');
      return { allow_register: true, unique_email: true, default_role: 'authenticated' };
    } }; },
    db: { query(model) { return {
      async findMany({ where }) {
        assert.equal(model, 'plugin::users-permissions.user');
        return members.filter((member) => member.email === where.email);
      },
      async findOne({ where }) {
        assert.equal(model, 'plugin::users-permissions.role');
        assert.equal(where.type, 'authenticated');
        return { id: 7 };
      },
      async create({ data }) { writes.push(data); return { id: 42, ...data }; },
    }; } },
  };
  return { service: serviceExports.__require()({ strapi }), writes };
}

test('new LinkedIn users are created through the existing Strapi member service with mapped profile fields', async () => {
  const { service, writes } = strapiConnect();
  const user = await service.connect('linkedin', { access_token: 'synthetic' });
  assert.equal(writes.length, 1);
  assert.equal(user.email, 'jane@example.com');
  assert.equal(user.provider, 'linkedin');
  assert.equal(user.role, 7);
  assert.equal(user.fullName, 'Jane Example');
  assert.equal(user.registrationSource, 'linkedin');
  assert.equal(user.registrationPlatform, 'web');
});

test('a matching local, Google or retired Facebook email is not automatically linked or changed', async () => {
  for (const provider of ['local', 'google', 'facebook']) {
    const existing = { id: 8, email: 'jane@example.com', provider, fullName: 'Existing member' };
    const { service, writes } = strapiConnect({ members: [existing] });
    await assert.rejects(() => service.connect('linkedin', { access_token: 'synthetic' }), /Email is already taken/);
    assert.equal(writes.length, 0);
    assert.equal(existing.provider, provider);
    assert.equal(existing.fullName, 'Existing member');
  }
});

test('existing LinkedIn members retain their account and invalid profiles cannot create any member', async () => {
  const existing = { id: 8, email: 'jane@example.com', provider: 'linkedin', fullName: 'Existing member' };
  const existingHarness = strapiConnect({ members: [existing] });
  assert.equal(await existingHarness.service.connect('linkedin', { access_token: 'synthetic' }), existing);
  assert.equal(existingHarness.writes.length, 0);
  for (const overrides of [{ email: undefined }, { email_verified: false }, { sub: undefined }]) {
    const h = strapiConnect({ profile: validProfile(overrides) });
    await assert.rejects(() => h.service.connect('linkedin', { access_token: 'synthetic' }));
    assert.equal(h.writes.length, 0);
  }
});
