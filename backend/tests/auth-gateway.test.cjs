const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const secret = crypto.randomBytes(32).toString('hex');
const routes = ['/auth/local', '/auth/local/register', '/auth/forgot-password', '/auth/reset-password', '/auth/send-email-confirmation'];
const compile = (file) => ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
}).outputText;
const source = compile('src/middlewares/auth-gateway.ts');

// Load the actual middleware into isolated instances with only synthetic env.
// No process env, Strapi bootstrap, database, SMTP, or external API is used.
function instance(env = { AUTH_GATEWAY_SECRET: secret }, prefix = '/api') {
  const comparisons = [];
  const sandbox = {
    exports: {}, Buffer, process: { env },
    require(name) {
      if (name === 'node:crypto') return { timingSafeEqual(a, b) {
        comparisons.push([a.length, b.length]);
        return crypto.timingSafeEqual(a, b);
      } };
      if (name === 'node:net') return require('node:net');
      assert.equal(name, 'node:path');
      return require('node:path');
    },
  };
  vm.runInNewContext(source, sandbox);
  const middleware = sandbox.exports.default({}, { strapi: { config: { get(key, fallback) {
    assert.equal(key, 'api.rest.prefix');
    assert.equal(fallback, '/api');
    return prefix;
  } } } });
  return { middleware, comparisons };
}

async function request(middleware, { method = 'POST', pathname = '/api/auth/local', header = '', clientIp = '' } = {}) {
  let calls = 0;
  const headers = {};
  const ctx = { method, path: pathname, get(name) {
      if (name === 'x-auth-gateway-secret') return header;
      assert.equal(name, 'x-auth-client-ip'); return clientIp;
    },
    set(name, value) { headers[name] = value; }, status: 200,
    request: new Proxy({ ip: '192.0.2.250' }, { get(target, key) {
      if (key === 'ip') return target.ip;
      throw new Error('Gateway must run before reading/parsing a body');
    } }),
  };
  await middleware(ctx, async () => { calls += 1; });
  return { ctx, calls, headers };
}

test('every protected native account operation rejects missing, wrong, malformed and duplicate gateway headers', async () => {
  const h = instance();
  for (const route of routes) {
    for (const header of ['', crypto.randomBytes(32).toString('hex'), 'short', 'g'.repeat(64), `${secret}, ${secret}`]) {
      const { ctx, calls, headers } = await request(h.middleware, { pathname: `/api${route}`, header });
      assert.equal(ctx.status, 403, route);
      assert.equal(calls, 0, 'No controller, body parser, or database effects');
      assert.equal(headers['Cache-Control'], 'no-store');
      assert(!JSON.stringify(ctx.body).includes(secret));
    }
  }
  assert.equal(h.comparisons.length, routes.length, 'Only well-shaped, fixed-size values reach timingSafeEqual');
  for (const lengths of h.comparisons) assert.deepEqual(lengths, [64, 64]);
});

test('valid gateway requests continue exactly once in independent server instances', async () => {
  const first = instance();
  const second = instance();
  for (const h of [first, second]) {
    for (const route of routes) {
      const { ctx, calls } = await request(h.middleware, { pathname: `/api${route}`, header: secret });
      assert.equal(calls, 1);
      assert.equal(ctx.status, 200);
      assert.equal(ctx.body, undefined);
    }
  }
});

test('missing or malformed configuration fails closed without consulting any other secret', async () => {
  for (const AUTH_GATEWAY_SECRET of [undefined, '', 'replace-me', ' '.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 'z'.repeat(64), ` ${secret}`]) {
    for (const NODE_ENV of ['test', 'development', undefined]) {
      const h = instance({ AUTH_GATEWAY_SECRET, NODE_ENV, JWT_SECRET: secret, CAPTCHA_SECRET: secret });
      for (const route of routes) {
        const { ctx, calls } = await request(h.middleware, { pathname: `/api${route}`, header: secret });
        assert.equal(ctx.status, 503);
        assert.equal(calls, 0);
        assert(!JSON.stringify(ctx.body).includes(secret));
      }
    }
    assert.throws(() => instance({ NODE_ENV: 'production', AUTH_GATEWAY_SECRET }), /AUTH_GATEWAY_SECRET must be configured/);
  }
  assert.doesNotThrow(() => instance({ NODE_ENV: 'production', AUTH_GATEWAY_SECRET: secret }));
});

test('casing, trailing slashes, encoded paths and normalized aliases cannot skip the gate', async () => {
  const h = instance();
  const aliases = ['/api/auth/local/', '/API/AUTH/LOCAL', '/api/%61uth/local', '/api/auth/%6cocal', '/api/auth/local%2f',
    '/api//auth/local', '/api/other/../auth/local', '/api%2fauth%2flocal'];
  for (const pathname of aliases) {
    const result = await request(h.middleware, { pathname });
    assert.equal(result.ctx.status, 403, pathname);
    assert.equal(result.calls, 0, pathname);
  }
});

test('the local provider callback alias is protected while real OAuth, admin, confirmation, and unrelated requests remain unchanged', async () => {
  for (const env of [{ AUTH_GATEWAY_SECRET: secret }, {}]) {
    const h = instance(env);
    for (const method of ['GET', 'HEAD']) {
      const result = await request(h.middleware, { method, pathname: '/api/auth/local/callback/' });
      assert.equal(result.ctx.status, env.AUTH_GATEWAY_SECRET ? 403 : 503);
      assert.equal(result.calls, 0);
    }
    for (const [method, pathname] of [
      ['POST', '/admin/login'], ['POST', '/admin/forgot-password'], ['GET', '/api/connect/google'],
      ['GET', '/api/auth/google/callback'], ['GET', '/api/auth/linkedin/callback'], ['GET', '/api/auth/twitter/callback'],
      ['GET', '/api/auth/email-confirmation'], ['POST', '/api/auth/change-password'], ['POST', '/api/auth/refresh'],
      ['POST', '/api/auth/logout'], ['GET', '/api/articles'], ['POST', '/api/auth/local-extra'], ['POST', '/api/auth/local/%ZZ'],
      ['GET', '/api/auth/local'], ['OPTIONS', '/api/auth/local'],
    ]) {
      const result = await request(h.middleware, { method, pathname });
      assert.equal(result.calls, 1, `${method} ${pathname}`);
      assert.equal(result.ctx.status, 200);
      assert.deepEqual(result.headers, {});
    }
  }
});

test('a custom REST prefix remains protected and does not block the old prefix', async () => {
  const h = instance({ AUTH_GATEWAY_SECRET: secret }, '/content/v1');
  assert.equal((await request(h.middleware, { pathname: '/content/v1/auth/local' })).ctx.status, 403);
  assert.equal((await request(h.middleware, { pathname: '/api/auth/local' })).calls, 1);
});

test('only an authenticated gateway can assert a well-formed client IP on protected routes', async () => {
  const h = instance();
  for (const clientIp of ['203.0.113.9', '2001:db8:1234:5678::']) {
    const denied = await request(h.middleware, { clientIp });
    assert.equal(denied.ctx.status, 403);
    assert.equal(denied.ctx.request.ip, '192.0.2.250');
    const allowed = await request(h.middleware, { header: secret, clientIp });
    assert.equal(allowed.calls, 1);
    assert.equal(allowed.ctx.request.ip, clientIp);
    const unrelated = await request(h.middleware, { header: secret, clientIp, pathname: '/admin/login' });
    assert.equal(unrelated.ctx.request.ip, '192.0.2.250');
  }
  for (const clientIp of ['', 'unknown', '203.0.113.1, 203.0.113.2', '1.2.3', '203.0.113.2 ', '2001:db8::/64']) {
    const result = await request(h.middleware, { header: secret, clientIp });
    assert.equal(result.calls, 1);
    assert.equal(result.ctx.request.ip, '192.0.2.250', 'Malformed identity retains the conservative proxy-IP bucket');
  }
});

test('global middleware executes after error handling and before parsing the body; Strapi rate limit stays enabled', () => {
  const sandbox = { exports: {}, process: { env: {} } };
  vm.runInNewContext(compile('config/middlewares.ts'), sandbox);
  const middleware = sandbox.exports.default;
  assert.equal(middleware[middleware.indexOf('strapi::errors') + 1], 'global::auth-gateway');
  assert(middleware.indexOf('global::auth-gateway') < middleware.indexOf('strapi::body'));
  const pluginSource = compile('config/plugins.ts');
  const plugins = { exports: {}, require: createRequire(path.join(root, 'config/plugins.ts')) };
  vm.runInNewContext(pluginSource, plugins);
  const env = (_key, fallback) => fallback;
  env.bool = env;
  env.int = env;
  env.array = env;
  const config = plugins.exports.default({ env });
  assert.equal(config['users-permissions'].config.ratelimit.enabled, true);
  assert.equal(config['users-permissions'].config.ratelimit.max, 10);
});

test('real installed Koa/Strapi router cannot dispatch a protected account handler without gateway authorization', async (t) => {
  const strapiRequire = createRequire(require.resolve('@strapi/strapi'));
  const coreRequire = createRequire(strapiRequire.resolve('@strapi/core'));
  const Koa = coreRequire('koa');
  const Router = coreRequire('@koa/router');
  const app = new Koa();
  const router = new Router({ prefix: '/api' });
  let handled = 0;
  let downstream = 0;
  app.use(instance().middleware);
  app.use(async (_ctx, next) => { downstream += 1; await next(); });
  for (const route of routes) router.post(route, (ctx) => { handled += 1; ctx.body = { ok: true }; });
  router.get('/auth/:provider/callback', (ctx) => { handled += 1; ctx.body = { provider: ctx.params.provider }; });
  app.use(router.routes());
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of routes) {
    for (const pathname of [`/api${route}`, `/api${route}/`, `/api${route}`.toUpperCase()]) {
      const response = await fetch(base + pathname, { method: 'POST' });
      assert.equal(response.status, 403, pathname);
      await response.text();
    }
  }
  for (const pathname of ['/api/%61uth/local', '/api/auth/local%2F', '/api/auth/local/callback', '/api/auth/%6cocal/callback']) {
    const response = await fetch(base + pathname, { method: pathname.includes('callback') ? 'GET' : 'POST' });
    assert.equal(response.status, 403, pathname);
    await response.text();
  }
  assert.equal(handled, 0);
  assert.equal(downstream, 0);
  for (const route of routes) {
    const response = await fetch(base + `/api${route}`, { method: 'POST', headers: { 'x-auth-gateway-secret': secret } });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  }
  const oauth = await fetch(base + '/api/auth/google/callback');
  assert.equal(oauth.status, 200);
  assert.deepEqual(await oauth.json(), { provider: 'google' });
  assert.equal(handled, routes.length + 1);
});

test('real Strapi rate limiting distinguishes gateway clients behind one proxy and still enforces its limit', async (t) => {
  const strapiRequire = createRequire(require.resolve('@strapi/strapi'));
  const coreRequire = createRequire(strapiRequire.resolve('@strapi/core'));
  const Koa = coreRequire('koa');
  const rateLimitPath = path.join(root, 'node_modules/@strapi/plugin-users-permissions/dist/server/middlewares/rateLimit.js');
  const nativeLimit = require(rateLimitPath).__require()({}, { strapi: { config: { get(key) {
    assert.equal(key, 'plugin::users-permissions.ratelimit');
    return { enabled: true, interval: 60_000, max: 10 };
  } } } });
  const app = new Koa();
  app.use(async (ctx, next) => {
    try { await next(); } catch (error) {
      assert.equal(error.name, 'RateLimitError');
      ctx.status = 429; ctx.body = { limited: true };
    }
  });
  app.use(instance().middleware);
  app.use(nativeLimit);
  app.use((ctx) => { ctx.body = { ip: ctx.request.ip }; });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/api/auth/local`;
  for (let index = 1; index <= 11; index += 1) {
    const ip = `198.51.100.${index}`;
    const response = await fetch(url, { method: 'POST', headers: { 'x-auth-gateway-secret': secret, 'x-auth-client-ip': ip } });
    assert.equal(response.status, 200, 'Different website clients do not share a Vercel egress bucket');
    assert.equal((await response.json()).ip, ip);
  }
  for (let index = 1; index <= 10; index += 1) {
    const response = await fetch(url, { method: 'POST', headers: { 'x-auth-gateway-secret': secret, 'x-auth-client-ip': '198.51.100.1' } });
    assert.equal(response.status, index === 10 ? 429 : 200);
    await response.text();
  }
});
