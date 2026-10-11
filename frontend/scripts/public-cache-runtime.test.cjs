/* eslint-disable @typescript-eslint/no-require-imports -- Exercise installed Next cache runtime against isolated in-memory storage and synthetic CMS responses. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const { test } = require('node:test');
const ts = require('typescript');

// Next's Node bootstrap exposes this global before loading its storage modules.
// Use real AsyncLocalStorage and the actual installed unstable_cache: the fake
// storage below knows nothing about fallback, refresh, or error recovery.
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const { unstable_cache } = require('next/cache');
const { workAsyncStorage } = require('next/dist/server/app-render/work-async-storage.external');
const { workUnitAsyncStorage } = require('next/dist/server/app-render/work-unit-async-storage.external');
const { cache: reactCache } = require('react');

function storage() {
  let now = 0;
  const entries = new Map();
  const reads = [], writes = [], keyInputs = [];
  return {
    entries, reads, writes, keyInputs,
    advance(milliseconds = 61_000) { now += milliseconds; },
    async generateSimpleCacheKey(input) {
      keyInputs.push(input);
      return createHash('sha256').update(input).digest('hex');
    },
    async get(key, options) {
      reads.push({ key, options });
      const entry = entries.get(key);
      return entry ? { value: entry.value, isStale: now - entry.updatedAt > entry.value.revalidate * 1000 } : null;
    },
    async set(key, value, options) {
      const stored = structuredClone(value);
      writes.push({ key, value: stored, options });
      entries.set(key, { value: stored, updatedAt: now });
    },
  };
}

async function render(incrementalCache, callback, { staticGeneration = true } = {}) {
  const work = { route: '/en', isStaticGeneration: staticGeneration, isDraftMode: false, incrementalCache };
  const unit = staticGeneration
    ? { type: 'prerender-legacy', phase: 'render', revalidate: Infinity, tags: null, implicitTags: { tags: [] } }
    : { type: 'request', phase: 'render', url: { pathname: '/en', search: '' }, implicitTags: { tags: [] } };
  return workAsyncStorage.run(work, () => workUnitAsyncStorage.run(unit, async () => {
    try {
      return await callback();
    } finally {
      // Match Next's request completion: do not leave background cache writes
      // or refreshes dangling between otherwise independent render contexts.
      await Promise.allSettled(Object.values(work.pendingRevalidates || {}));
    }
  }));
}

const compiled = new Map();
function source(name) {
  if (!compiled.has(name)) {
    const filename = path.join(__dirname, '../src/lib', `${name}.ts`);
    compiled.set(name, ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText);
  }
  return compiled.get(name);
}

function cmsLoader({ baseUrl = 'https://cms-a.example.test', respond } = {}) {
  const modules = new Map();
  const requests = [];
  let failure = false;
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const exports = {};
    modules.set(name, exports);
    vm.runInNewContext(source(name), {
      exports, URL, URLSearchParams, AbortSignal,
      process: { env: { STRAPI_URL: baseUrl } },
      console: { error() {}, warn() {} },
      async fetch(input, options) {
        const url = new URL(input);
        assert.equal(url.origin, baseUrl);
        assert.equal(options.cache, 'no-store', 'Only the complete public snapshot owns the transport cache');
        assert.equal(options.next, undefined, 'No independent fetch cache may mix fresh and stale snapshot parts');
        assert.equal(options.headers.Authorization, undefined, 'Public cache transport must never contain a member token');
        requests.push({ url, options });
        if (failure) throw new Error('Synthetic CMS transport failure');
        const result = await respond(url);
        const status = result.status ?? 200;
        return { ok: status >= 200 && status < 300, status, json: async () => result };
      },
      require(request) {
        if (request === 'server-only') return {};
        if (request === 'next/cache') return { unstable_cache };
        // This is real React.cache, not an invented persistent memoization map.
        // Outside React's render dispatcher it does not hide per-request reads.
        if (request === 'react') return { cache: reactCache };
        assert(request.startsWith('@/lib/'), `Unexpected dependency: ${request}`);
        return load(request.slice('@/lib/'.length));
      },
    }, { filename: `${name}.ts` });
    return exports;
  }
  return { api: load('strapi'), requests, fail(value = true) { failure = value; } };
}

const testimonial = (name = 'Synthetic learner') => ({
  documentId: 'synthetic-testimonial', studentName: name, quote: 'A synthetic review used only in tests.', enabled: true,
});

for (const staticGeneration of [true, false]) {
  test(`real Next cache retains the last good public snapshot on ${staticGeneration ? 'static foreground' : 'dynamic background'} refresh failure`, async (t) => {
    const logged = [];
    t.mock.method(console, 'error', (...args) => logged.push(args));
    const cache = storage();
    const loader = cmsLoader({ respond: () => ({ data: [testimonial()] }) });
    const read = () => render(cache, () => loader.api.getTestimonialsData('en'), { staticGeneration });
    const first = await read();
    assert.equal(first[0].name, 'Synthetic learner');
    assert.equal(cache.writes.length, 1);
    const originalBody = cache.writes[0].value.data.body;

    cache.advance();
    loader.fail();
    assert.deepEqual(JSON.parse(JSON.stringify(await read())), JSON.parse(JSON.stringify(first)));
    assert.equal(loader.requests.length, 2, 'A real refresh was attempted rather than a permanently fresh hit');
    assert.equal(cache.writes.length, 1, 'A failed refresh must not write fallback or an empty result');
    assert.equal([...cache.entries.values()][0].value.data.body, originalBody);
    assert.equal(logged.length, 1, 'Installed Next logs its caught refresh failure');
  });
}

test('a first-ever snapshot failure rejects without caching anything and a later request can recover', async () => {
  const cache = storage();
  const loader = cmsLoader({ respond: () => ({ data: [testimonial('Recovered learner')] }) });
  loader.fail();
  await assert.rejects(() => render(cache, () => loader.api.getTestimonialsData('en')), /Synthetic CMS transport failure/);
  assert.equal(cache.writes.length, 0);
  assert.equal(cache.entries.size, 0);
  loader.fail(false);
  const recovered = await render(cache, () => loader.api.getTestimonialsData('en'));
  assert.equal(recovered[0].name, 'Recovered learner');
  assert.equal(cache.writes.length, 1);
});

test('a successful empty public result replaces the previous snapshot and is not mistaken for an outage', async () => {
  const cache = storage();
  let data = [testimonial()];
  const loader = cmsLoader({ respond: () => ({ data }) });
  await render(cache, () => loader.api.getTestimonialsData('en'));
  data = [];
  cache.advance();
  assert.equal((await render(cache, () => loader.api.getTestimonialsData('en'))).length, 0);
  assert.equal(cache.writes.length, 2);
  assert.equal(cache.writes[1].value.data.body, '[]');
  loader.fail();
  assert.equal((await render(cache, () => loader.api.getTestimonialsData('en'))).length, 0);
  assert.equal(loader.requests.length, 2, 'The fresh empty snapshot is a valid cache hit');
});

test('cold global-settings decoration fallback is not written into the public snapshot', async () => {
  const cache = storage();
  const loader = cmsLoader({ respond: () => ({ data: { siteName: 'Synthetic restored CMS brand' } }) });
  loader.fail();
  const fallback = await render(cache, () => loader.api.getGlobalData('en'));
  assert.ok(fallback.siteName);
  assert.equal(cache.writes.length, 0);
  loader.fail(false);
  const restored = await render(cache, () => loader.api.getGlobalData('en'));
  assert.equal(restored.siteName, 'Synthetic restored CMS brand');
  assert.equal(cache.writes.length, 1);
});

test('an authored homepage noindex flag survives a failed refresh and changes only on successful CMS data', async (t) => {
  t.mock.method(console, 'error', () => {});
  const cache = storage();
  let noIndex = true;
  const loader = cmsLoader({ respond: () => ({ data: { pageTitle: 'Synthetic CMS title', seo: { noIndex } } }) });
  assert.equal((await render(cache, () => loader.api.getHomepageSettings('zh'))).seo.noIndex, true);
  cache.advance();
  loader.fail();
  assert.equal((await render(cache, () => loader.api.getHomepageSettings('zh'))).seo.noIndex, true);
  assert.equal(cache.writes.length, 1);
  noIndex = false;
  loader.fail(false);
  assert.equal((await render(cache, () => loader.api.getHomepageSettings('zh'))).seo.noIndex, false);
  assert.equal(cache.writes.length, 2);
});

test('public snapshot keys are isolated by locale and configured CMS origin across render contexts', async () => {
  const cache = storage();
  const a = cmsLoader({ respond: (url) => ({ data: [testimonial(`A/${url.searchParams.get('locale')}`)] }) });
  const b = cmsLoader({ baseUrl: 'https://cms-b.example.test', respond: (url) => ({ data: [testimonial(`B/${url.searchParams.get('locale')}`)] }) });
  for (const locale of ['en', 'zh']) {
    assert.equal((await render(cache, () => a.api.getTestimonialsData(locale)))[0].name, `A/${locale}`);
    assert.equal((await render(cache, () => b.api.getTestimonialsData(locale)))[0].name, `B/${locale}`);
  }
  assert.equal(cache.entries.size, 4);
  assert.equal(new Set(cache.writes.map((write) => write.key)).size, 4);
  assert(cache.keyInputs.some((key) => key.includes('suremandarin-public-v1,https://cms-a.example.test,testimonials') && key.endsWith('-["en"]')));
  assert(cache.keyInputs.some((key) => key.includes('suremandarin-public-v1,https://cms-b.example.test,testimonials') && key.endsWith('-["zh"]')));
  a.fail();
  b.fail();
  for (const locale of ['en', 'zh']) {
    assert.equal((await render(cache, () => a.api.getTestimonialsData(locale)))[0].name, `A/${locale}`);
    assert.equal((await render(cache, () => b.api.getTestimonialsData(locale)))[0].name, `B/${locale}`);
  }
  assert.equal(a.requests.length, 2);
  assert.equal(b.requests.length, 2);
});

test('article bodies and built-in ownership refresh as one snapshot, then a successful withdrawal removes the article', async (t) => {
  t.mock.method(console, 'error', () => {});
  const cache = storage();
  const slug = 'how-to-practise-tones';
  let records = [{
    documentId: 'synthetic-cms-guide', slug, title: 'Original synthetic CMS title',
    body: 'Original synthetic public body.', category: { slug: 'study-tips' }, enabled: true, accessLevel: 'public',
  }];
  let ownershipFails = false;
  const loader = cmsLoader({ respond(url) {
    if (url.pathname === '/api/articles') return { data: records, meta: { pagination: { pageCount: 1 } } };
    assert.equal(url.pathname, '/api/articles/builtin-overrides');
    if (ownershipFails) throw new Error('Synthetic ownership failure');
    return { data: [slug] };
  } });
  const read = () => render(cache, () => loader.api.getKnowledgeArticle(slug, 'study-tips', 'en'));
  assert.equal((await read()).title, 'Original synthetic CMS title');
  assert.equal(cache.writes.length, 1, 'There must be one atomic snapshot, not two independent endpoint caches');

  records = [];
  ownershipFails = true;
  cache.advance();
  assert.equal((await read()).title, 'Original synthetic CMS title');
  assert.equal(cache.writes.length, 1, 'Partial success cannot replace the complete previous snapshot');

  ownershipFails = false;
  assert.equal(await read(), null, 'A withdrawn CMS-owned URL cannot revive the code-authored fallback guide');
  assert.equal(cache.writes.length, 2);
  const stored = JSON.parse(cache.writes[1].value.data.body);
  assert.deepEqual(stored.records, []);
  assert.deepEqual(stored.ownedSlugs, [slug]);
});

test('even an unexpected member record in a public response cannot be persisted as a readable public body', async () => {
  const cache = storage();
  const slug = 'how-to-practise-tones';
  const loader = cmsLoader({ respond: (url) => url.pathname === '/api/articles/builtin-overrides'
    ? { data: [slug] }
    : { data: [{ documentId: 'synthetic-private', slug, title: 'Restricted synthetic title', body: 'DO NOT CACHE SYNTHETIC MEMBER BODY', category: { slug: 'study-tips' }, accessLevel: 'vip', enabled: true }], meta: { pagination: { pageCount: 1 } } },
  });
  assert.equal(await render(cache, () => loader.api.getKnowledgeArticle(slug, 'study-tips', 'en')), null);
  assert.equal(cache.writes.length, 1);
  assert.equal(cache.writes[0].value.data.body.includes('DO NOT CACHE SYNTHETIC MEMBER BODY'), false);
  assert.equal(cache.writes[0].value.data.body.includes('Restricted synthetic title'), false);
});

test('an unavailable ownership endpoint is not a successful empty ownership list that revives a withdrawn guide', async (t) => {
  t.mock.method(console, 'error', () => {});
  const cache = storage();
  const slug = 'how-to-practise-tones';
  let ownershipStatus = 200;
  const loader = cmsLoader({ respond: (url) => url.pathname === '/api/articles/builtin-overrides'
    ? { status: ownershipStatus, data: ownershipStatus === 200 ? [slug] : [] }
    : { data: [], meta: { pagination: { pageCount: 1 } } },
  });
  const read = () => render(cache, () => loader.api.getKnowledgeArticle(slug, 'study-tips', 'en'));
  assert.equal(await read(), null);
  cache.advance();
  ownershipStatus = 404;
  assert.equal(await read(), null, 'A missing safety endpoint must retain the last known withdrawal');
  assert.equal(cache.writes.length, 1, 'Do not replace the ownership snapshot on HTTP 404');
});
