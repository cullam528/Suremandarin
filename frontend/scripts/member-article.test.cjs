/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node test harness for an isolated server-only TypeScript module. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// All tokens, articles and responses below are synthetic. The real module runs
// with isolated dependencies and cannot make a network request or read a session.
const modulePath = path.join(__dirname, '../src/lib/member-article.ts');
const compiled = ts.transpileModule(fs.readFileSync(modulePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const backend = 'https://member-cms.example.test';
const fakeToken = 'synthetic-member-token';

function article(overrides = {}) {
  return {
    documentId: 'synthetic-member-article',
    slug: 'member-tone-guide',
    title: 'A synthetic member guide',
    body: 'Synthetic restricted content used only by this test.',
    category: { slug: 'study-tips' },
    locale: 'zh',
    publishedAt: '2026-01-01T00:00:00.000Z',
    enabled: true,
    accessLevel: 'vip',
    seo: { metaTitle: 'An editor-authored title', noIndex: false },
    ...overrides,
  };
}

function loader({ publicArticle = null, token = null, status = 200, data = [] } = {}) {
  const calls = { public: [], auth: 0, fetch: [], json: 0, parse: [] };
  const loadedModule = { exports: {} };
  const sandbox = {
    exports: loadedModule.exports,
    URLSearchParams,
    AbortSignal,
    async fetch(input, options) {
      const url = new URL(input);
      assert.equal(url.origin, backend, 'Member credentials must only go to the configured backend');
      assert.equal(url.pathname, '/api/articles');
      calls.fetch.push({ url, options });
      return {
        status,
        ok: status >= 200 && status < 300,
        async json() {
          calls.json += 1;
          return { data };
        },
      };
    },
    require(request) {
      if (request === 'server-only') return {};
      // Each loader represents one isolated request. Cross-request memoization
      // would conceal a session leak, so the stub introduces no shared cache.
      if (request === 'react') return { cache: (fn) => fn };
      if (request === '@/lib/auth') return {
        STRAPI_URL: backend,
        async getAuthToken() {
          calls.auth += 1;
          return typeof token === 'function' ? token() : token;
        },
      };
      if (request === '@/lib/strapi') return {
        async getKnowledgeArticle(...args) {
          calls.public.push(args);
          return publicArticle;
        },
        parseArticle(raw, index, category) {
          calls.parse.push({ raw, index, category });
          return { ...raw, id: raw.documentId, seo: { ...raw.seo } };
        },
      };
      throw new Error(`Unexpected dependency: ${request}`);
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: modulePath });
  return { read: loadedModule.exports.getReadableKnowledgeArticle, calls };
}

test('public articles return without reading a session or sending a member request', async () => {
  const publicArticle = article({ accessLevel: 'public', seo: { noIndex: false } });
  const { read, calls } = loader({ publicArticle, token: fakeToken });
  assert.equal(await read('member-tone-guide', 'study-tips', 'zh'), publicArticle);
  assert.deepEqual(calls.public, [['member-tone-guide', 'study-tips', 'zh']]);
  assert.equal(calls.auth, 0);
  assert.equal(calls.fetch.length, 0);
  assert.equal(calls.parse.length, 0);
  assert.equal(publicArticle.seo.noIndex, false);
});

test('an anonymous request for a nonpublic or unknown article returns null without fetching it', async () => {
  const { read, calls } = loader();
  assert.equal(await read('unknown-guide', 'study-tips', 'en'), null);
  assert.deepEqual(calls.public, [['unknown-guide', 'study-tips', 'en']]);
  assert.equal(calls.auth, 1);
  assert.equal(calls.fetch.length, 0);
  assert.equal(calls.parse.length, 0);
});

test('authorized member lookup uses a private backend fetch and always returns noindex SEO', async () => {
  const raw = article();
  const { read, calls } = loader({ token: fakeToken, data: [raw] });
  const result = await read(raw.slug, 'study-tips', 'zh');

  assert.equal(calls.auth, 1);
  assert.equal(calls.fetch.length, 1);
  const { url, options } = calls.fetch[0];
  assert.equal(url.origin, backend);
  assert.equal(url.searchParams.get('filters[slug][$eq]'), raw.slug);
  assert.equal(url.searchParams.get('filters[category][slug][$eq]'), 'study-tips');
  assert.equal(url.searchParams.get('locale'), 'zh');
  assert.equal(url.searchParams.get('status'), 'published');
  assert.equal(url.searchParams.get('pagination[pageSize]'), '1');
  assert.equal(url.searchParams.get('populate[cover]'), 'true');
  assert.equal(url.searchParams.get('populate[category]'), 'true');
  assert.equal(url.searchParams.get('populate[seo][populate]'), 'shareImage');
  assert.equal(options.headers.Authorization, `Bearer ${fakeToken}`);
  assert.equal(options.headers.Accept, 'application/json');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.next, undefined);
  assert(options.signal instanceof AbortSignal);
  assert.equal(url.search.includes(fakeToken), false, 'Tokens must not appear in URLs');
  assert.equal(calls.parse.length, 1);
  assert.equal(calls.parse[0].raw, raw);
  assert.equal(calls.parse[0].index, 0);
  assert.equal(calls.parse[0].category, 'study-tips');
  assert.equal(result.id, raw.documentId);
  assert.equal(result.body, raw.body);
  assert.equal(result.seo.noIndex, true);
  assert.equal(result.seo.metaTitle, raw.seo.metaTitle);
  assert.equal(raw.seo.noIndex, false, 'Private SEO must not mutate the upstream object');
});

test('a route value cannot redirect the Bearer token or add a different query filter', async () => {
  const slug = 'guide&locale=en&redirect=https://untrusted.example.test/collect';
  const { read, calls } = loader({ token: fakeToken, data: [] });
  assert.equal(await read(slug, 'study-tips', 'zh'), null);
  const { url } = calls.fetch[0];
  assert.equal(url.origin, backend);
  assert.equal(url.searchParams.get('filters[slug][$eq]'), slug);
  assert.deepEqual(url.searchParams.getAll('locale'), ['zh']);
  assert.equal(url.searchParams.has('redirect'), false);
});

test('denied or missing member responses return null without parsing their response bodies', async () => {
  for (const status of [401, 403, 404]) {
    const { read, calls } = loader({ token: fakeToken, status, data: [article()] });
    assert.equal(await read('member-tone-guide', 'study-tips', 'zh'), null, `HTTP ${status}`);
    assert.equal(calls.fetch.length, 1);
    assert.equal(calls.json, 0);
    assert.equal(calls.parse.length, 0);
  }
});

test('a backend failure rejects instead of disguising an outage as a missing article', async () => {
  const { read, calls } = loader({ token: fakeToken, status: 500 });
  await assert.rejects(
    () => read('member-tone-guide', 'study-tips', 'zh'),
    (error) => error.message === 'Member article request failed: 500' && !error.message.includes(fakeToken),
  );
  assert.equal(calls.json, 0);
  assert.equal(calls.parse.length, 0);
});

test('unexpected, disabled or unpublished backend records cannot become a readable article', async () => {
  const invalidResponses = [
    ['empty collection', []],
    ['null data', null],
    ['wrong slug', [article({ slug: 'a-different-article' })]],
    ['wrong category', [article({ category: { slug: 'chinese-culture' } })]],
    ['missing category', [article({ category: null })]],
    ['disabled', [article({ enabled: false })]],
    ['missing enabled flag', [article({ enabled: undefined })]],
    ['unpublished', [article({ publishedAt: null })]],
    ['missing publication field', [article({ publishedAt: undefined })]],
  ];
  for (const [label, data] of invalidResponses) {
    const { read, calls } = loader({ token: fakeToken, data });
    assert.equal(await read('member-tone-guide', 'study-tips', 'zh'), null, label);
    assert.equal(calls.parse.length, 0, label);
  }
});

test('a successful member lookup does not expose its body to a separate anonymous request', async () => {
  let currentToken = fakeToken;
  const { read, calls } = loader({ token: () => currentToken, data: [article()] });
  assert.equal((await read('member-tone-guide', 'study-tips', 'zh')).body, article().body);
  currentToken = null;
  assert.equal(await read('member-tone-guide', 'study-tips', 'zh'), null);
  assert.equal(calls.auth, 2);
  assert.equal(calls.fetch.length, 1);
});
