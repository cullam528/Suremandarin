/* eslint-disable @typescript-eslint/no-require-imports -- Node-only mocked auth transport; no accounts or real endpoints are used. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const modulePath = path.join(__dirname, '../src/lib/auth-request.ts');
const compiled = ts.transpileModule(fs.readFileSync(modulePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness(fetch) {
  const timers = new Map();
  let nextTimer = 1;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, fetch, AbortController, TypeError,
    setTimeout(callback, delay) { const id = nextTimer++; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  }, { filename: modulePath });
  return { send: exports.sendAuthRequest, timers };
}

test('successful auth sends JSON and always clears the request timeout', async () => {
  const payload = { email: 'synthetic@example.test', password: 'synthetic-test-only' };
  const api = harness(async (url, options) => {
    assert.equal(url, '/api/auth/login');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Accept, 'application/json');
    assert.deepEqual(JSON.parse(options.body), payload);
    return { ok: true, json: async () => ({ user: { id: 'synthetic' } }) };
  });
  assert.equal((await api.send('/api/auth/login', payload, 'en')).user.id, 'synthetic');
  assert.equal(api.timers.size, 0);
});

test('a network failure gives a useful message and a subsequent retry can succeed', async () => {
  let attempts = 0;
  const api = harness(async () => {
    if (++attempts === 1) throw new TypeError('Synthetic fetch failure');
    return { ok: true, json: async () => ({ ok: true }) };
  });
  await assert.rejects(api.send('/api/auth/login', {}, 'en'), /Connection lost/);
  assert.equal(api.timers.size, 0);
  assert.equal((await api.send('/api/auth/login', {}, 'en')).ok, true);
  assert.equal(api.timers.size, 0);
});

test('HTML/non-JSON gateway errors are explained rather than leaking a JSON parse exception', async () => {
  const api = harness(async () => ({ ok: false, json: async () => { throw new SyntaxError("Unexpected token '<'"); } }));
  await assert.rejects(api.send('/api/auth/register', {}, 'en'), /temporarily unavailable/);
  assert.equal(api.timers.size, 0);
});

test('invalid JSON in a successful HTTP response is still an auth failure', async () => {
  const api = harness(async () => ({ ok: true, json: async () => null }));
  await assert.rejects(api.send('/api/auth/login', {}, 'zh'), /服务暂时不可用/);
  assert.equal(api.timers.size, 0);
});

test('known account errors are localized and release the timer', async () => {
  const api = harness(async () => ({ ok: false, json: async () => ({ error: 'Invalid identifier or password' }) }));
  await assert.rejects(api.send('/api/auth/login', {}, 'zh'), /邮箱或密码不正确/);
  assert.equal(api.timers.size, 0);
});

test('timeout aborts the pending request, clears timers and permits a fresh retry', async () => {
  let firstSignal;
  let attempts = 0;
  const api = harness(async (_url, { signal }) => {
    if (++attempts > 1) return { ok: true, json: async () => ({ ok: true }) };
    firstSignal = signal;
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('Synthetic abort')), { once: true }));
  });
  const pending = api.send('/api/auth/register', {}, 'en');
  const rejection = assert.rejects(pending, /connection timed out/i);
  const timeout = [...api.timers.values()][0];
  assert.equal(timeout.delay, 45_000);
  timeout.callback();
  await rejection;
  assert.equal(firstSignal.aborted, true);
  assert.equal(api.timers.size, 0);
  assert.equal((await api.send('/api/auth/login', {}, 'en')).ok, true);
  assert.equal(api.timers.size, 0);
});
