/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS tests for the browser service worker. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

// The real worker runs against in-memory events, Cache Storage and fetch.
// No browser registration, network requests or production cache writes occur.
const origin = 'https://service-worker.example.test';
const workerPath = path.join(__dirname, '../public/sw.js');
const source = fs.readFileSync(workerPath, 'utf8');
const absolute = (value) => new URL(typeof value === 'string' ? value : value.url, origin).href;

function request(pathname, options = {}) {
  return {
    url: absolute(pathname),
    method: 'GET',
    mode: 'cors',
    headers: new Headers(),
    ...options,
  };
}

function loader({ response = new Response('fresh network content'), offline = false } = {}) {
  const handlers = new Map();
  const stores = new Map();
  const calls = { fetch: [], open: [], addAll: [], put: [], match: [], deleted: [], skipWaiting: 0, claim: 0 };
  const caches = {
    async open(name) {
      calls.open.push(name);
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async addAll(paths) {
          calls.addAll.push(Array.from(paths));
          for (const path of paths) store.set(absolute(path), new Response(`Installed ${path}`));
        },
        async put(key, value) {
          calls.put.push({ cache: name, url: absolute(key), response: value });
          store.set(absolute(key), value.clone());
        },
        async match(key) {
          return store.get(absolute(key))?.clone();
        },
      };
    },
    async keys() { return Array.from(stores.keys()); },
    async delete(name) {
      calls.deleted.push(name);
      return stores.delete(name);
    },
    async match(key) {
      calls.match.push(absolute(key));
      for (const store of stores.values()) {
        const value = store.get(absolute(key));
        if (value) return value.clone();
      }
      return undefined;
    },
  };
  vm.runInNewContext(source, {
    URL,
    Response,
    caches,
    self: {
      location: { origin },
      addEventListener(type, handler) { handlers.set(type, handler); },
      skipWaiting() { calls.skipWaiting += 1; },
      clients: { async claim() { calls.claim += 1; } },
    },
    async fetch(input) {
      calls.fetch.push(input);
      if (offline) throw new TypeError('Synthetic offline network');
      return response;
    },
  }, { filename: workerPath });

  return {
    calls,
    stores,
    seed(name, entries = []) {
      stores.set(name, new Map(entries.map(([url, value]) => [absolute(url), value])));
    },
    async dispatch(type, input) {
      const background = [];
      let intercepted = false;
      let responsePromise;
      const event = {
        request: input,
        waitUntil(promise) { background.push(Promise.resolve(promise)); },
        respondWith(promise) {
          assert.equal(intercepted, false, 'Only one response can be supplied per fetch event');
          intercepted = true;
          responsePromise = Promise.resolve(promise);
        },
      };
      assert(handlers.has(type), `Missing worker handler: ${type}`);
      handlers.get(type)(event);
      const result = responsePromise ? await responsePromise : undefined;
      // Fetch callbacks may register waitUntil after respondWith has started.
      for (let index = 0; index < background.length; index += 1) await background[index];
      return { intercepted, response: result };
    },
  };
}

test('installation precaches only the public logo and icon, not authenticated HTML', async () => {
  const api = loader();
  await api.dispatch('install');
  assert.deepEqual(api.calls.addAll, [[
    '/images/suremandarin-icon.webp',
    '/images/suremandarin-logo.webp',
  ]]);
  assert.equal(api.calls.open.length, 1);
  assert.match(api.calls.open[0], /^suremandarin-daily-/);
  assert.equal(api.calls.skipWaiting, 1);
  assert.equal(api.calls.fetch.length, 0);
});

test('login, registration, account and API requests are never intercepted or cached', async () => {
  const paths = [
    '/login', '/register', '/account', '/en/login', '/zh/login',
    '/en/register', '/zh/register', '/en/account', '/zh/account/profile',
    '/en/forgot-password', '/zh/reset-password?code=synthetic',
    '/api/security/puzzle', '/api/auth/login', '/api/auth/me', '/api/daily/progress',
  ];
  for (const pathname of paths) {
    const api = loader({ offline: true });
    const result = await api.dispatch('fetch', request(pathname, { mode: 'navigate' }));
    assert.equal(result.intercepted, false, pathname);
    assert.equal(api.calls.fetch.length, 0, pathname);
    assert.equal(api.calls.open.length, 0, pathname);
    assert.equal(api.calls.match.length, 0, pathname);
  }
});

test('Next RSC requests, ordinary pages, external resources and non-GET requests bypass the worker', async () => {
  const requests = [
    request('/en/daily?_rsc=synthetic', { headers: new Headers({ RSC: '1', Accept: 'text/x-component' }) }),
    request('/zh/daily', { headers: new Headers({ RSC: '1', 'Next-Router-Prefetch': '1' }) }),
    request('/en/daily', { mode: 'navigate', headers: new Headers({ RSC: '1' }) }),
    request('/zh/daily?_rsc=synthetic', { mode: 'navigate' }),
    request('/en/daily?_rsc=', { mode: 'navigate' }),
    request('/images/logo.webp', { headers: new Headers({ RSC: '1' }) }),
    request('/en/account?_rsc=synthetic', { headers: new Headers({ RSC: '1' }) }),
    request('/en/daily'),
    request('/en/daily/day-one', { mode: 'navigate' }),
    request('/en/daily-other', { mode: 'navigate' }),
    request('/en', { mode: 'navigate' }),
    request('/en/knowledge', { mode: 'navigate' }),
    request('/_next/static/chunks/app.js'),
    request('https://external.example.test/images/photo.webp'),
    request('/images/photo.webp', { method: 'POST' }),
    request('/en/daily', { method: 'POST', mode: 'navigate' }),
  ];
  for (const input of requests) {
    const api = loader();
    assert.equal((await api.dispatch('fetch', input)).intercepted, false, input.url);
    assert.equal(api.calls.fetch.length, 0, input.url);
    assert.equal(api.calls.put.length, 0, input.url);
    assert.equal(api.calls.match.length, 0, input.url);
  }
});

test('successful same-origin public images and Daily document navigations are cached after fetching', async () => {
  const requests = [
    request('/images/hero-panda.webp'),
    request('/images/captcha/captcha-lantern.png?v=synthetic'),
    request('/course-detail/images/teacher-jessica.webp'),
    request('/en/daily', { mode: 'navigate' }),
    request('/zh/daily', { mode: 'navigate' }),
    request('/en/daily/', { mode: 'navigate' }),
  ];
  for (const input of requests) {
    const networkResponse = new Response('public network content');
    const api = loader({ response: networkResponse });
    const result = await api.dispatch('fetch', input);
    assert.equal(result.intercepted, true, input.url);
    assert.equal(result.response, networkResponse, 'The network response must reach the page');
    assert.deepEqual(api.calls.fetch, [input]);
    assert.equal(api.calls.put.length, 1);
    assert.equal(api.calls.put[0].url, input.url);
    assert.notEqual(api.calls.put[0].response, networkResponse, 'Caching must use a cloned response');
    assert.equal(await result.response.text(), 'public network content');
    assert.equal(await api.stores.get(api.calls.put[0].cache).get(input.url).text(), 'public network content');
  }
});

test('HTTP failures and redirected responses are not cached or replaced by old successful content', async () => {
  const responses = [401, 403, 404, 500, 503].map((status) => new Response('error response', { status }));
  const redirected = new Response('a followed redirect');
  Object.defineProperty(redirected, 'redirected', { value: true });
  responses.push(redirected);
  for (const response of responses) {
    const api = loader({ response });
    api.seed('suremandarin-daily-prior', [['/en/daily', new Response('stale success')]]);
    const result = await api.dispatch('fetch', request('/en/daily', { mode: 'navigate' }));
    assert.equal(result.response, response);
    assert.equal(api.calls.put.length, 0);
    assert.equal(api.calls.match.length, 0);
  }
});

test('successful private, no-store and RSC responses reach the page without entering offline caches', async () => {
  const headers = [
    { 'Cache-Control': 'private' },
    { 'Cache-Control': 'max-age=0, private, must-revalidate' },
    { 'Cache-Control': 'no-store' },
    { 'Cache-Control': 'public, no-store, max-age=0' },
    { 'Content-Type': 'text/x-component' },
    { 'Content-Type': 'text/x-component; charset=utf-8' },
  ];
  for (const value of headers) {
    const response = new Response('synthetic response that must not be stored', { headers: value });
    const api = loader({ response });
    const result = await api.dispatch('fetch', request('/en/daily', { mode: 'navigate' }));
    assert.equal(result.response, response);
    assert.equal(api.calls.put.length, 0, JSON.stringify(value));
    assert.equal(api.calls.match.length, 0, JSON.stringify(value));
    assert.equal(api.stores.size, 0, JSON.stringify(value));
  }
});

test('offline requests can recover only their exact previously cached resource', async () => {
  const api = loader({ offline: true });
  api.seed('suremandarin-daily-current', [
    ['/en/daily', new Response('cached English Daily document')],
    ['/images/logo.webp?v=one', new Response('cached logo')],
  ]);
  const daily = await api.dispatch('fetch', request('/en/daily', { mode: 'navigate' }));
  assert.equal(await daily.response.text(), 'cached English Daily document');
  const image = await api.dispatch('fetch', request('/images/logo.webp?v=one'));
  assert.equal(await image.response.text(), 'cached logo');
  for (const input of [
    request('/zh/daily', { mode: 'navigate' }),
    request('/images/logo.webp?v=two'),
    request('/images/missing.webp'),
  ]) {
    const result = await api.dispatch('fetch', input);
    assert.equal(result.response.type, 'error', input.url);
    assert.equal(result.response.status, 0, input.url);
  }
  assert.equal(api.calls.put.length, 0);
});

test('activation removes only previous SureMandarin Daily caches and retains unrelated application caches', async () => {
  const api = loader();
  await api.dispatch('install');
  const current = api.calls.open[0];
  const oldCaches = ['suremandarin-daily-v1', 'suremandarin-daily-v2', 'suremandarin-daily-outdated'];
  const unrelated = ['other-app-v1', 'suremandarin-other-v1', 'unrelated-suremandarin-daily-v1'];
  for (const name of [...oldCaches, ...unrelated]) api.seed(name);
  await api.dispatch('activate');
  assert.deepEqual(api.calls.deleted.slice().sort(), oldCaches.slice().sort());
  assert(api.stores.has(current));
  for (const name of unrelated) assert(api.stores.has(name), name);
  for (const name of oldCaches) assert.equal(api.stores.has(name), false, name);
  assert.equal(api.calls.claim, 1);
});
