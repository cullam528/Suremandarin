/* eslint-disable @typescript-eslint/no-require-imports -- Offline security harness: no network or production credentials. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const { NextResponse } = require('next/server');

const initialTime = 1_800_000_000_000;
const origin = 'https://website.example.test';
const backend = 'https://cms.example.test';
const configured = {
  NODE_ENV: 'production', VERCEL: '1', STRAPI_URL: backend,
  TURNSTILE_SECRET_KEY: 'synthetic-server-key-for-offline-tests',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'synthetic-public-key-for-offline-tests',
  TURNSTILE_HOSTNAMES: 'website.example.test',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-redis-token',
  AUTH_RATE_LIMIT_PREFIX: 'isolated-test',
  AUTH_GATEWAY_SECRET: 'a7'.repeat(32),
};

function sharedServices() {
  let now = initialTime;
  const counters = new Map(), claims = new Map(), requests = [], tokens = new Map();
  const state = { redisFailure: null, providerFailure: null, providerOverride: null, redisOverride: undefined };
  let serial = 0;
  function token(action = 'login', overrides = {}) {
    const value = `synthetic-provider-token-${++serial}`;
    tokens.set(value, {
      success: true, hostname: 'website.example.test', action,
      challenge_ts: new Date(now - 1000).toISOString(), ...overrides,
    });
    return { token: value };
  }
  async function fetchMock(url, options = {}) {
    const payload = JSON.parse(options.body);
    requests.push({ url: String(url), options, payload });
    if (String(url) === configured.UPSTASH_REDIS_REST_URL) {
      if (state.redisFailure === 'network') throw new TypeError('offline Redis failure');
      if (state.redisFailure === 'http') return Response.json({}, { status: 503 });
      if (state.redisFailure === 'error') return Response.json({ error: 'synthetic Redis error' });
      if (state.redisFailure === 'json') return new Response('{broken');
      if (state.redisOverride !== undefined) return Response.json({ result: state.redisOverride });
      const [command] = payload;
      if (command === 'EVAL') {
        const [, script, keys, key, windowMs, maximum, nonce] = payload;
        assert.equal(keys, '1'); assert.match(script, /redis.call\('TIME'\)/);
        assert.equal(typeof nonce, 'string');
        // Model the shared atomic REST contract; a separate local-Redis test validates actual Lua.
        const previous = (counters.get(key) ?? []).filter((entry) => entry > now - windowMs);
        if (previous.length >= maximum) return Response.json({ result: [0, Math.max(1, previous[0] + windowMs - now)] });
        previous.push(now); counters.set(key, previous);
        return Response.json({ result: [1, 0] });
      }
      if (command === 'SET') {
        const [, key, value, nx, ex, ttl] = payload;
        assert.deepEqual([value, nx, ex, ttl], ['1', 'NX', 'EX', 300]);
        if ((claims.get(key) ?? 0) > now) return Response.json({ result: null });
        claims.set(key, now + ttl * 1000);
        return Response.json({ result: 'OK' });
      }
      throw new Error(`Unexpected Redis command ${command}`);
    }
    assert.equal(String(url), 'https://challenges.cloudflare.com/turnstile/v0/siteverify', 'No unmocked endpoint may be contacted');
    if (state.providerFailure === 'network') throw new TypeError('offline provider failure');
    if (state.providerFailure === 'http') return Response.json({}, { status: 503 });
    if (state.providerFailure === 'json') return new Response('{broken');
    assert.equal(payload.secret, configured.TURNSTILE_SECRET_KEY);
    return Response.json(state.providerOverride ?? tokens.get(payload.response) ?? { success: false, 'error-codes': ['invalid-input-response'] });
  }
  return { state, requests, counters, claims, token, fetch: fetchMock, now: () => now, advance(ms) { now += ms; } };
}

function instance({ services = sharedServices(), env = {}, upstream } = {}) {
  const cache = new Map(), sessions = [], upstreamRequests = [];
  const effectiveEnv = { ...configured, ...env };
  class TestDate extends Date { static now() { return services.now(); } }
  function load(relative) {
    const filename = path.join(__dirname, '../src', relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(compiled, {
      exports, Buffer, Date: TestDate, URL, Headers, Request, Response, AbortSignal,
      process: { env: effectiveEnv },
      fetch: async (url, options) => {
        if (String(url).startsWith(backend)) {
          upstreamRequests.push({ url: String(url), options });
          return upstream ? upstream(url, options) : Response.json({ jwt: 'synthetic-jwt', user: { id: 42, email: 'learner@example.test' } });
        }
        return services.fetch(url, options);
      },
      require(name) {
        if (name === 'server-only') return {};
        if (name === 'node:crypto') return crypto;
        if (name === 'node:net') return net;
        if (name === 'next/server') return { NextResponse };
        if (name === '@/lib/auth') return { STRAPI_URL: backend, setAuthCookie: async (jwt) => sessions.push(jwt) };
        if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
        if (name.startsWith('.')) return load(path.relative(path.join(__dirname, '../src'), path.resolve(path.dirname(filename), `${name}.ts`)));
        throw new Error(`Unexpected import ${name}`);
      },
    }, { filename });
    return exports;
  }
  return { api: load('lib/auth-security.ts'), load, services, sessions, upstreamRequests };
}
function request(ip = '192.0.2.10', extra = {}) {
  return new Request(`${origin}/api/auth/login`, { headers: { 'x-vercel-forwarded-for': ip, ...extra } });
}
function post(action, payload, ip = '192.0.2.10') {
  return new Request(`${origin}/api/auth/${action}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-vercel-forwarded-for': ip }, body: JSON.stringify(payload),
  });
}
function isSecurityError(status) { return (error) => error.status === status && ['SECURITY_UNAVAILABLE', 'RATE_LIMITED', 'INVALID_REQUEST'].includes(error.code); }

for (const key of Object.keys(configured).filter((key) => !['NODE_ENV', 'VERCEL'].includes(key))) {
  test(`missing ${key} fails closed before any outbound request`, async () => {
    const harness = instance({ env: { [key]: undefined } });
    await assert.rejects(harness.api.enforceIpLimit(request(), 'login'), isSecurityError(503));
    assert.equal(harness.services.requests.length, 0);
  });
}

for (const [label, overrides] of [
  ['public Turnstile test secret', { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' }],
  ['public Turnstile test site key', { NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }],
  ['short gateway secret', { AUTH_GATEWAY_SECRET: 'replace-me' }],
  ['credential-bearing Redis URL', { UPSTASH_REDIS_REST_URL: 'https://user:pass@redis.example.test' }],
  ['insecure Redis URL', { UPSTASH_REDIS_REST_URL: 'http://redis.example.test' }],
  ['localhost production Redis URL', { UPSTASH_REDIS_REST_URL: 'http://127.0.0.1:6379' }],
  ['Redis query string', { UPSTASH_REDIS_REST_URL: 'https://redis.example.test/?key=secret' }],
  ['wildcard hostname', { TURNSTILE_HOSTNAMES: '*.example.test' }],
  ['local production hostname', { TURNSTILE_HOSTNAMES: 'localhost' }],
]) {
  test(`${label} is rejected by production configuration validation`, async () => {
    const harness = instance({ env: overrides });
    await assert.rejects(harness.api.verifyCaptcha(harness.services.token(), 'login'), isSecurityError(503));
    assert.equal(harness.services.requests.length, 0);
  });
}

test('siteverify is mandatory: legacy slider proofs and invented movement data cannot authorize requests', async () => {
  const { api, services } = instance();
  for (const value of [undefined, null, [], 'token', {}, { token: '' }, { token: 1 }, { token: 'x'.repeat(2049) }, { token: 'unissued', position: 50, elapsedMs: 650, moves: 1000 }, { token: 'unissued', trap: 'bot' }]) {
    assert.equal(await api.verifyCaptcha(value, 'login'), false);
  }
  assert.equal(services.claims.size, 0);
});

test('provider success validates action, exact hostname, age and timestamp before claiming a token', async () => {
  const { api, services } = instance();
  for (const overrides of [
    { success: false }, { action: 'register' }, { action: undefined },
    { hostname: 'attacker.example.test' }, { hostname: 'website.example.test.attacker.test' }, { hostname: undefined },
    { challenge_ts: new Date(initialTime - 300000).toISOString() },
    { challenge_ts: new Date(initialTime + 1).toISOString() }, { challenge_ts: 'invalid' }, { challenge_ts: undefined },
  ]) assert.equal(await api.verifyCaptcha(services.token('login', overrides), 'login'), false);
  assert.equal(services.claims.size, 0);
  assert.equal(await api.verifyCaptcha(services.token('login', { hostname: 'WEBSITE.EXAMPLE.TEST', challenge_ts: new Date(initialTime - 299999).toISOString() }), 'login'), true);
});

test('replay is rejected across isolated application instances even if provider returns success repeatedly', async () => {
  const services = sharedServices();
  const first = instance({ services }).api, second = instance({ services }).api;
  const captcha = services.token();
  assert.equal(await first.verifyCaptcha(captcha, 'login'), true);
  assert.equal(await first.verifyCaptcha(captcha, 'login'), false);
  assert.equal(await second.verifyCaptcha(captcha, 'login'), false);
  services.advance(300000);
  assert.equal(await second.verifyCaptcha(captcha, 'login'), false, 'Expired proof cannot become reusable after claim TTL');
});

test('concurrent duplicate verification on separate instances allows only one claim', async () => {
  const services = sharedServices(), captcha = services.token();
  const results = await Promise.all(Array.from({ length: 12 }, () => instance({ services }).api.verifyCaptcha(captcha, 'login')));
  assert.equal(results.filter(Boolean).length, 1);
  const providerRequests = services.requests.filter((entry) => entry.url.includes('siteverify'));
  assert.equal(providerRequests.length, 12, 'Test provider intentionally accepts duplicates; Redis must still reject them');
});

for (const failure of ['network', 'http', 'json']) test(`provider ${failure} failure is unavailable, never an accepted proof`, async () => {
  const { api, services } = instance(); services.state.providerFailure = failure;
  await assert.rejects(api.verifyCaptcha(services.token(), 'login'), isSecurityError(503));
  assert.equal(services.claims.size, 0);
});

for (const providerOverride of [{}, { success: 'true' }, { success: false, 'error-codes': ['invalid-input-secret'] }, { success: false, 'error-codes': ['internal-error'] }]) {
  test(`malformed/misconfigured provider response fails closed: ${JSON.stringify(providerOverride)}`, async () => {
    const { api, services } = instance(); services.state.providerOverride = providerOverride;
    await assert.rejects(api.verifyCaptcha(services.token(), 'login'), isSecurityError(503));
  });
}

for (const failure of ['network', 'http', 'error', 'json']) test(`Redis ${failure} failure cannot fall back to local acceptance`, async () => {
  const { api, services } = instance(); services.state.redisFailure = failure;
  await assert.rejects(api.enforceIpLimit(request(), 'login'), isSecurityError(503));
  await assert.rejects(api.verifyCaptcha(services.token(), 'login'), isSecurityError(503));
});

test('malformed Redis results fail closed for both rate and replay operations', async () => {
  const { api, services } = instance();
  for (const result of [null, 'OK', [], [1], [2, 0], [0, -1], [0, 900001], ['1', 0]]) {
    services.state.redisOverride = result;
    await assert.rejects(api.enforceIpLimit(request(), 'login'), isSecurityError(503));
  }
  services.state.redisOverride = 1;
  await assert.rejects(api.verifyCaptcha(services.token(), 'login'), isSecurityError(503));
});

for (const [action, limit] of [['login', 10], ['register', 6], ['forgot-password', 5], ['reset-password', 8]]) {
  test(`${action} quota is shared across concurrent instances and resets at the sliding-window boundary`, async () => {
    const services = sharedServices();
    const first = instance({ services }).api, second = instance({ services }).api;
    const results = await Promise.allSettled(Array.from({ length: limit + 5 }, (_, index) => (index % 2 ? first : second).enforceIpLimit(request(), action)));
    assert.equal(results.filter((value) => value.status === 'fulfilled').length, limit);
    for (const value of results.filter((value) => value.status === 'rejected')) {
      assert.equal(value.reason.status, 429); assert.equal(value.reason.retryAfter, 900);
    }
    await assert.rejects(instance({ services }).api.enforceIpLimit(request(), action), isSecurityError(429), 'Cold instance shares previous quota');
    services.advance(899999);
    await assert.rejects(first.enforceIpLimit(request(), action), isSecurityError(429));
    services.advance(1);
    await second.enforceIpLimit(request(), action);
  });
}

test('forged forwarding headers do not create new buckets on Vercel', async () => {
  const { api } = instance();
  for (let i = 0; i < 10; i++) await api.enforceIpLimit(request('192.0.2.10', { 'x-forwarded-for': `198.51.100.${i}` }), 'login');
  await assert.rejects(api.enforceIpLimit(request('192.0.2.10', { 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '203.0.113.10' }), 'login'), isSecurityError(429));
  await api.enforceIpLimit(request('192.0.2.11'), 'login');
});

test('missing/malformed trusted addresses share a restrictive bucket; IPv6 rotation shares a /64', async () => {
  const { api } = instance();
  for (let i = 0; i < 10; i++) await api.enforceIpLimit(request('', { 'x-forwarded-for': `198.51.100.${i}` }), 'login');
  await assert.rejects(api.enforceIpLimit(request('192.0.2.10, 192.0.2.11'), 'login'), isSecurityError(429));
  for (let i = 0; i < 10; i++) await api.enforceIpLimit(request(`2001:db8:1234:5678::${i + 1}`), 'login');
  await assert.rejects(api.enforceIpLimit(request('2001:0db8:1234:5678:0000:0000:0000:ffff'), 'login'), isSecurityError(429));
});

test('account quota is normalized and shared across instances while storing no raw identifiers', async () => {
  const services = sharedServices(), first = instance({ services }).api, second = instance({ services }).api;
  for (let i = 0; i < 10; i++) await first.enforceAccountLimit('login', ' Learner@Example.Test ');
  await assert.rejects(second.enforceAccountLimit('login', 'learner@example.test'), isSecurityError(429));
  await second.enforceAccountLimit('login', 'other@example.test');
  await second.enforceAccountLimit('register', 'learner@example.test');
  for (const key of services.counters.keys()) assert.doesNotMatch(key, /learner|example|192\.0\.2/i);
});

test('error responses are uncached, include Retry-After, and disclose no service credentials', async () => {
  const { api } = instance();
  const response = api.securityErrorResponse(new api.AuthSecurityError(429, 'RATE_LIMITED', 'Too many attempts.', 13));
  assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '13');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { error: 'Too many attempts.', code: 'RATE_LIMITED' });
  assert.equal(api.securityErrorResponse(new Error('not a security error')), null);
});

test('actual body length is bounded including streamed bodies without a Content-Length header', async () => {
  const { api } = instance();
  assert.equal((await api.readAuthBody(post('login', { identifier: 'learner@example.test' }))).identifier, 'learner@example.test');
  for (const body of ['', '{broken', '[]', 'null', '123', JSON.stringify({ padding: 'x'.repeat(17000) })]) {
    const req = new Request(`${origin}/api/auth/login`, { method: 'POST', body });
    await assert.rejects(api.readAuthBody(req), isSecurityError(400));
  }
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode('{"data":"')); controller.enqueue(new TextEncoder().encode('x'.repeat(17000))); controller.close(); } });
  await assert.rejects(api.readAuthBody(new Request(`${origin}/api/auth/login`, { method: 'POST', body: stream, duplex: 'half' })), isSecurityError(400));
});

const flowData = {
  login: { identifier: 'learner@example.test', password: 'Synthetic-only-password' },
  register: { fullName: 'Test Learner', email: 'learner@example.test', password: 'Synthetic-only-password', privacyConsent: true, marketingConsent: false, sourceChannel: 'website' },
  'forgot-password': { email: 'learner@example.test' },
  'reset-password': { code: 'synthetic-reset-code', password: 'Synthetic-only-password', passwordConfirmation: 'Synthetic-only-password' },
};
const upstreamPaths = { login: 'local', register: 'local/register', 'forgot-password': 'forgot-password', 'reset-password': 'reset-password' };

for (const action of Object.keys(flowData)) {
  test(`normal ${action} reaches only the authenticated Strapi gateway and creates the expected session`, async () => {
    const harness = instance();
    const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
    const response = await POST(post(action, { ...flowData[action], ...(action === 'reset-password' ? {} : { captcha: harness.services.token(action) }) }));
    assert.equal(response.status, 200);
    assert.equal(harness.upstreamRequests.length, 1);
    const upstream = harness.upstreamRequests[0];
    assert.equal(upstream.url, `${backend}/api/auth/${upstreamPaths[action]}`);
    assert.equal(new Headers(upstream.options.headers).get('x-auth-gateway-secret'), configured.AUTH_GATEWAY_SECRET);
    assert.equal(new Headers(upstream.options.headers).get('x-auth-client-ip'), '192.0.2.10');
    assert.equal(upstream.options.cache, 'no-store');
    assert.equal(harness.sessions.length, action === 'forgot-password' ? 0 : 1);
    const body = await response.text();
    assert.ok(!body.includes(configured.AUTH_GATEWAY_SECRET));
    assert.ok(!body.includes(configured.TURNSTILE_SECRET_KEY));
    assert.ok(!body.includes('synthetic-jwt'), 'Session token belongs only in HttpOnly cookie');
  });

  test(`${action} rejects missing security configuration before calling backend or setting cookies`, async () => {
    const harness = instance({ env: { AUTH_GATEWAY_SECRET: undefined } });
    const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
    const response = await POST(post(action, { ...flowData[action], captcha: harness.services.token(action) }));
    assert.equal(response.status, 503); assert.equal((await response.json()).code, 'SECURITY_UNAVAILABLE');
    assert.equal(harness.upstreamRequests.length, 0); assert.equal(harness.sessions.length, 0);
  });

  test(`${action} returns shared 429 and Retry-After without backend access after quota exhaustion`, async () => {
    const harness = instance(), maximum = { login: 10, register: 6, 'forgot-password': 5, 'reset-password': 8 }[action];
    for (let i = 0; i < maximum; i++) await harness.api.enforceIpLimit(request(), action);
    const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
    const response = await POST(post(action, { ...flowData[action], captcha: harness.services.token(action) }));
    assert.equal(response.status, 429); assert.equal(response.headers.get('Retry-After'), '900');
    assert.equal(harness.upstreamRequests.length, 0); assert.equal(harness.sessions.length, 0);
  });
}

for (const action of ['login', 'register', 'forgot-password']) test(`${action} rejects simulated automation without touching Strapi or session cookies`, async () => {
  const harness = instance();
  const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
  const response = await POST(post(action, { ...flowData[action], captcha: { token: 'invented-token', position: 50, moves: 99, elapsedMs: 800 } }));
  assert.equal(response.status, 400); assert.equal((await response.json()).code, 'CAPTCHA_INVALID');
  assert.equal(harness.upstreamRequests.length, 0); assert.equal(harness.sessions.length, 0);
});

test('a mistyped password can be corrected with a fresh captcha while replay remains rejected', async () => {
  let attempts = 0;
  const harness = instance({ upstream: async () => ++attempts === 1
    ? Response.json({ error: { message: 'Invalid identifier or password' } }, { status: 400 })
    : Response.json({ jwt: 'synthetic-jwt', user: { id: 42 } }) });
  const { POST } = harness.load('app/api/auth/login/route.ts'), captcha = harness.services.token();
  const wrong = await POST(post('login', { ...flowData.login, password: 'wrong-password', captcha }));
  assert.equal(wrong.status, 400); assert.equal(harness.sessions.length, 0);
  const replay = await POST(post('login', { ...flowData.login, captcha }));
  assert.equal(replay.status, 400); assert.equal((await replay.json()).code, 'CAPTCHA_INVALID'); assert.equal(attempts, 1);
  const retry = await POST(post('login', { ...flowData.login, captcha: harness.services.token() }));
  assert.equal(retry.status, 200); assert.equal(attempts, 2); assert.deepEqual(harness.sessions, ['synthetic-jwt']);
});

for (const action of ['login', 'register', 'forgot-password']) test(`${action} invalid captcha attempts from different IPs cannot exhaust a victim account budget`, async () => {
  const harness = instance();
  const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
  for (let i = 0; i < 12; i++) {
    const response = await POST(post(action, { ...flowData[action], captcha: { token: 'invented-token' } }, `198.51.100.${i + 1}`));
    assert.equal(response.status, 400); assert.equal((await response.json()).code, 'CAPTCHA_INVALID');
  }
  assert.equal(harness.upstreamRequests.length, 0);
  const valid = await POST(post(action, { ...flowData[action], captcha: harness.services.token(action) }, '203.0.113.10'));
  assert.equal(valid.status, 200);
  assert.equal(harness.upstreamRequests.length, 1);
});

test('verified wrong-password attempts count against the shared account budget even across different IPs', async () => {
  const harness = instance({ upstream: async () => Response.json({ error: { message: 'Invalid identifier or password' } }, { status: 400 }) });
  const { POST } = harness.load('app/api/auth/login/route.ts');
  for (let i = 0; i < 10; i++) {
    const response = await POST(post('login', { ...flowData.login, captcha: harness.services.token() }, `198.51.100.${i + 1}`));
    assert.equal(response.status, 400);
  }
  const limited = await POST(post('login', { ...flowData.login, captcha: harness.services.token() }, '203.0.113.10'));
  assert.equal(limited.status, 429); assert.equal(harness.upstreamRequests.length, 10);
  assert.equal(harness.sessions.length, 0);
});

test('authenticated gateway client identity comes only from the trusted ingress header', () => {
  const { api } = instance();
  const trusted = api.authGatewayHeaders(request('192.0.2.10', { 'x-forwarded-for': '203.0.113.99', 'x-auth-client-ip': '203.0.113.100' }));
  assert.equal(trusted['x-auth-client-ip'], '192.0.2.10');
  const unknown = api.authGatewayHeaders(request('', { 'x-forwarded-for': '203.0.113.99' }));
  assert.equal(unknown['x-auth-client-ip'], undefined);
  const ipv6 = api.authGatewayHeaders(request('2001:0db8:1234:5678:0000:0000:0000:ffff'));
  assert.equal(ipv6['x-auth-client-ip'], '2001:db8:1234:5678::');
});

for (const action of ['login', 'reset-password']) test(`${action} rejects malformed upstream success without creating a session`, async () => {
  const malformedResults = [null, [], 'success', {}, { user: { id: 42 } }, { jwt: null, user: { id: 42 } }, { jwt: '', user: { id: 42 } }, { jwt: 123, user: { id: 42 } }, { jwt: 'synthetic-jwt' }, { jwt: 'synthetic-jwt', user: null }, { jwt: 'synthetic-jwt', user: 'learner' }, { jwt: 'synthetic-jwt', user: [] }];
  for (const result of malformedResults) {
    const harness = instance({ upstream: async () => Response.json(result) });
    const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
    const response = await POST(post(action, { ...flowData[action], captcha: harness.services.token(action) }));
    assert.equal(response.status, 502, `Malformed success must fail: ${JSON.stringify(result)}`);
    assert.equal(harness.sessions.length, 0);
  }
  const harness = instance({ upstream: async () => new Response('<html>gateway error</html>') });
  const { POST } = harness.load(`app/api/auth/${action}/route.ts`);
  const response = await POST(post(action, { ...flowData[action], captcha: harness.services.token(action) }));
  assert.equal(response.status, 502, 'HTML with HTTP 200 is not authentication success');
  assert.equal(harness.sessions.length, 0);
});

test('registration preserves email-confirmation responses with user but no JWT', async () => {
  const harness = instance({ upstream: async () => Response.json({ user: { id: 42, email: 'learner@example.test', confirmed: false } }) });
  const { POST } = harness.load('app/api/auth/register/route.ts');
  const response = await POST(post('register', { ...flowData.register, captcha: harness.services.token('register') }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).user.confirmed, false);
  assert.equal(harness.sessions.length, 0);
});

for (const prefix of ['unsafe:scope', 'unsafe{scope}', 'two words', 'x'.repeat(65)]) test(`unsafe Redis namespace ${JSON.stringify(prefix)} fails closed`, async () => {
  const harness = instance({ env: { AUTH_RATE_LIMIT_PREFIX: prefix } });
  await assert.rejects(harness.api.enforceIpLimit(request(), 'login'), isSecurityError(503));
  assert.equal(harness.services.requests.length, 0);
});
