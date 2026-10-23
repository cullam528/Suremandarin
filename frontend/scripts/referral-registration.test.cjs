/* eslint-disable @typescript-eslint/no-require-imports -- Execute real registration routes with synthetic requests, no live accounts. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextResponse } = require('next/server');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const origin = 'https://website.example.test';
const backend = 'https://cms.example.test';
const contextCookie = 'suremandarin_oauth_context';
const registration = {
  fullName: 'Synthetic New Learner', email: 'new@example.test', password: 'synthetic-test-only',
  privacyConsent: true, marketingConsent: false, sourceChannel: 'website', captcha: { token: 'synthetic' },
};

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
    }, ...globals,
  }, { filename });
  return exports;
}

function registrationHarness({ captcha = true, allowed = true, status = 200, result } = {}) {
  const requests = [], sessions = [];
  const route = load('app/api/auth/register/route.ts', {
    'next/server': { NextResponse },
    '@/lib/auth': { STRAPI_URL: backend, setAuthCookie: async (token) => sessions.push(token) },
    '@/lib/puzzle-captcha': { allowRequest: () => allowed, verifyPuzzleProof: () => captcha },
  }, {
    fetch: async (url, options) => {
      requests.push({ url, options, body: JSON.parse(options.body) });
      return { ok: status === 200, status, json: async () => result ?? (status === 200
        ? { jwt: 'synthetic-session', user: { id: 2 } }
        : { error: { message: 'Email or Username are already taken' } }) };
    },
  });
  return { requests, sessions, register: (body) => route.POST(new Request(`${origin}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })) };
}

function callbackHarness(context, { ok = true, result = { jwt: 'synthetic-session' } } = {}) {
  const requests = [], sessions = [], deleted = [];
  let savedCookie = typeof context === 'string' ? context : context ? Buffer.from(JSON.stringify(context)).toString('base64url') : undefined;
  const { GET } = load('app/api/auth/oauth/callback/[provider]/route.ts', {
    'next/server': { NextResponse },
    'next/headers': { cookies: async () => ({
      get: () => savedCookie ? { value: savedCookie } : undefined,
      delete: (name) => { deleted.push(name); savedCookie = undefined; },
    }) },
    '@/lib/auth': { STRAPI_URL: backend, setAuthCookie: async (token) => sessions.push(token) },
  }, { fetch: async (url, options) => {
    requests.push({ url: new URL(url), options });
    return { ok, json: async () => result };
  } });
  return { requests, sessions, deleted, callback: (provider, query = 'access_token=synthetic') =>
    GET(new Request(`${origin}/api/auth/oauth/callback/${provider}?${query}`), { params: Promise.resolve({ provider }) }) };
}

test('ordinary invitation registration reaches Strapi using referredByCode', async () => {
  const app = registrationHarness();
  const response = await app.register({ ...registration, referredByCode: ' INVITER123 ' });
  assert.equal(response.status, 200);
  assert.equal(app.requests[0].body.referredByCode, 'INVITER123');
  assert.equal(app.requests[0].url, `${backend}/api/auth/local/register`);
  assert.equal(Object.hasOwn(app.requests[0].body, 'referralCode'), false, 'Must not set the new member’s own referral code');
  assert.deepEqual(app.sessions, ['synthetic-session']);
});

test('ordinary registration without an invitation preserves the normal account flow', async () => {
  const app = registrationHarness();
  const response = await app.register(registration);
  assert.equal(response.status, 200);
  assert.equal(Object.hasOwn(app.requests[0].body, 'referredByCode'), false);
  assert.equal(app.requests[0].body.email, registration.email);
  assert.deepEqual(app.sessions, ['synthetic-session']);
});

for (const provider of ['google', 'linkedin', 'twitter']) {
  test(`${provider} invitation registration forwards the saved referral before the backend creates the account`, async () => {
    const context = { locale: 'zh', mode: 'register', ref: ' INVITER123 ', source: 'website' };
    const app = callbackHarness(context);
    const response = await app.callback(provider);
    assert.equal(app.requests[0].url.searchParams.get('referredByCode'), 'INVITER123');
    assert.equal(app.requests[0].url.searchParams.get('mode'), 'register');
    assert.equal(app.requests[0].url.searchParams.get('referralSource'), 'website');
    assert.deepEqual(app.deleted, [contextCookie]);
    assert.deepEqual(app.sessions, ['synthetic-session']);
    assert.equal(response.headers.get('location'), `${origin}/zh/account/profile`);
  });

  test(`${provider} login ignores invitation fields and forged callback relation parameters`, async () => {
    const app = callbackHarness({ locale: 'en', mode: 'login', ref: 'COOKIE-INVITER' });
    await app.callback(provider, 'access_token=synthetic&referredByCode=FORGED&referralCode=FORGED&referrer=1&referrerId=1&referredUser=2&referredUserId=2&referee=2&refereeId=2&ref=FORGED&refName=Fake&mode=register&source=forged&registrationSource=forged&referralSource=forged');
    assert.deepEqual([...app.requests[0].url.searchParams], [['access_token', 'synthetic']]);
    assert.deepEqual(app.sessions, ['synthetic-session']);
  });

  test(`${provider} repeated callbacks cannot reuse the consumed invitation cookie`, async () => {
    const app = callbackHarness({ locale: 'en', mode: 'register', ref: 'INVITER123' });
    await app.callback(provider);
    await app.callback(provider);
    assert.equal(app.requests[0].url.searchParams.get('referredByCode'), 'INVITER123');
    assert.equal(app.requests[1].url.searchParams.has('referredByCode'), false);
    assert.equal(app.requests[1].url.searchParams.has('mode'), false);
  });

  test(`${provider} cookie invitation wins over a callback-supplied different referrer`, async () => {
    const app = callbackHarness({ locale: 'en', mode: 'register', ref: 'INVITER123', source: 'whatsapp' });
    await app.callback(provider, 'access_token=synthetic&referredByCode=FORGED&referralSource=forged&mode=login');
    assert.equal(app.requests[0].url.searchParams.get('referredByCode'), 'INVITER123');
    assert.equal(app.requests[0].url.searchParams.get('referralSource'), 'whatsapp');
    assert.equal(app.requests[0].url.searchParams.get('mode'), 'register');
  });
}

test('a stale registration client can use the legacy input alias but cannot set protected user fields', async () => {
  const app = registrationHarness();
  await app.register({ ...registration, referralCode: ' LEGACY123 ', referrer: 100, referredUser: 101,
    role: 1, confirmed: true, blocked: false, referralTrialGranted: true, lessonHoursBalance: 999 });
  assert.equal(app.requests[0].body.referredByCode, 'LEGACY123');
  for (const key of ['referralCode', 'referrer', 'referredUser', 'role', 'confirmed', 'blocked', 'referralTrialGranted', 'lessonHoursBalance']) {
    assert.equal(Object.hasOwn(app.requests[0].body, key), false);
  }
});

test('canonical invitation field takes precedence over the old alias', async () => {
  const app = registrationHarness();
  await app.register({ ...registration, referredByCode: 'CANONICAL123', referralCode: 'LEGACY123' });
  assert.equal(app.requests[0].body.referredByCode, 'CANONICAL123');
});

test('unknown invitation codes reach backend validation without frontend fabricating a reward', async () => {
  const app = registrationHarness();
  const response = await app.register({ ...registration, referredByCode: 'UNKNOWN' });
  assert.equal(app.requests[0].body.referredByCode, 'UNKNOWN');
  assert.deepEqual(await response.json(), { user: { id: 2 } });
});

for (const value of ['', '   ', 'X'.repeat(81), { referralCode: 'INVITER123' }, ['INVITER123'], 123]) {
  test(`malformed local invitation ${JSON.stringify(value)} does not block normal registration or become a code`, async () => {
    const app = registrationHarness();
    assert.equal((await app.register({ ...registration, referredByCode: value })).status, 200);
    assert.equal(Object.hasOwn(app.requests[0].body, 'referredByCode'), false);
  });
}

test('existing local account failure creates no session or separate reward request', async () => {
  const app = registrationHarness({ status: 400 });
  assert.equal((await app.register({ ...registration, referredByCode: 'INVITER123' })).status, 400);
  assert.equal(app.requests.length, 1);
  assert.deepEqual(app.sessions, []);
});

for (const [options, status] of [[{ captcha: false }, 400], [{ allowed: false }, 429]]) {
  test(`registration security rejection ${status} never reaches Strapi`, async () => {
    const app = registrationHarness(options);
    assert.equal((await app.register({ ...registration, referredByCode: 'INVITER123' })).status, status);
    assert.equal(app.requests.length, 0);
    assert.deepEqual(app.sessions, []);
  });
}

test('email-confirmation registration without a JWT never sets an undefined session cookie', async () => {
  const app = registrationHarness({ result: { user: { id: 2, confirmed: false } } });
  assert.equal((await app.register({ ...registration, referredByCode: 'INVITER123' })).status, 200);
  assert.deepEqual(app.sessions, []);
});

for (const context of [undefined, 'invalid-base64-json', { mode: 'register', ref: { code: 'INVITER123' } }, { mode: 'register', ref: 'X'.repeat(81) }]) {
  test(`missing or malformed OAuth invitation ${JSON.stringify(context)} cannot create a callback referral`, async () => {
    const app = callbackHarness(context);
    await app.callback('google', 'access_token=synthetic&referredByCode=FORGED&referralCode=FORGED');
    assert.equal(app.requests[0].url.searchParams.has('referredByCode'), false);
    assert.equal(app.requests[0].url.searchParams.has('referralCode'), false);
    assert.deepEqual(app.sessions, ['synthetic-session']);
  });
}

function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => findNode(child, predicate)).find(Boolean);
  return predicate(node) ? node : findNode(node.props?.children, predicate);
}

test('the rendered invitation form submits referredByCode through the actual Next registration route', async () => {
  const slots = [], payloads = [];
  let cursor = 0;
  const app = registrationHarness();
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const { AuthForm } = load('components/auth/AuthForm.tsx', {
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in slots)) slots[index] = initial;
        return [slots[index], (update) => { slots[index] = typeof update === 'function' ? update(slots[index]) : update; }];
      },
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/image': { __esModule: true, default: 'image', getImageProps: (props) => ({ props }) },
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { useRouter: () => ({ push() {}, refresh() {} }) },
    'lucide-react': {},
    '@/lib/auth-request': { sendAuthRequest: async (url, payload) => {
      assert.equal(url, '/api/auth/register'); payloads.push(payload); await app.register(payload);
    } },
    './PuzzleCaptcha': { PuzzleCaptcha: 'captcha' },
  }, {
    window: { location: { search: '?ref=INVITER123&source=whatsapp' } },
    FormData: class { get(key) { return key === 'privacyConsent' ? 'on' : registration[key] ?? ''; } },
  });
  const render = () => { cursor = 0; return AuthForm({ locale: 'en', mode: 'register' }); };
  findNode(render(), (node) => node.type === 'captcha').props.onChange({ token: 'synthetic' });
  const form = findNode(render(), (node) => node.type === 'form');
  await form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
  assert.equal(payloads[0].referredByCode, 'INVITER123');
  assert.equal(Object.hasOwn(payloads[0], 'referralCode'), false);
  assert.equal(app.requests[0].body.referredByCode, 'INVITER123');
  assert.equal(app.requests[0].body.registrationSource, 'whatsapp');
});

for (const referralCode of [undefined, 'PERSISTED123']) {
  test(`account referral section uses only a persisted invitation code (${referralCode ?? 'missing'})`, () => {
    const jsx = (type, props) => ({ type, props: props ?? {} });
    const { AccountSection } = load('components/site/AccountSection.tsx', {
      'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': { __esModule: true, default: 'a' },
      'lucide-react': {}, '@/components/site/ReferralCenter': { ReferralCenter: 'referral-center' },
      '@/components/site/MyCoursesPanel': { MyCoursesPanel: 'courses' },
    });
    const tree = AccountSection({ locale: 'en', section: 'referrals', user: { username: 'synthetic', referralCode }, overview: null });
    const center = findNode(tree, (node) => node.type === 'referral-center');
    if (referralCode) assert.equal(center.props.referralCode, referralCode);
    else {
      assert.equal(center, undefined);
      assert.match(findNode(tree, (node) => node.props?.role === 'status').props.children, /temporarily unavailable/);
      assert.doesNotMatch(JSON.stringify(tree), /SM-SYNTHET/);
    }
  });
}

test('the invitation center renders on the server without window or navigator and retains its persisted code', () => {
  const { ReferralCenter } = load('components/site/ReferralCenter.tsx', {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'), 'lucide-react': require('lucide-react'),
  });
  const html = renderToStaticMarkup(React.createElement(ReferralCenter, {
    locale: 'en', referralCode: 'PERSISTED123', referrerName: 'Synthetic Learner', overview: null,
  }));
  assert.match(html, /PERSISTED123/);
  assert.match(html, /Copy link/);
  assert.match(html, /\/en\/register\?ref=PERSISTED123/);
  assert.doesNotMatch(html, /https:\/\/wa.me\/\?text=/, 'External sharing destinations wait for the browser origin');
});
