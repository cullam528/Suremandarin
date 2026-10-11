/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Next route tests with synthetic dependencies and no network. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const routePaths = {
  root: fs.existsSync(path.join(__dirname, '../src/app/(legacy)/page.tsx'))
    ? 'app/(legacy)/page.tsx' : 'app/page.tsx',
  category: 'app/[lang]/knowledge/[category]/page.tsx',
  article: 'app/[lang]/knowledge/[category]/[slug]/page.tsx',
};
const compiled = new Map();
function load(relativePath, imports) {
  const filename = path.join(__dirname, '../src', relativePath);
  if (!compiled.has(filename)) {
    compiled.set(filename, ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText);
  }
  const exports = {};
  vm.runInNewContext(compiled.get(filename), {
    exports, URLSearchParams,
    require(name) {
      if (Object.hasOwn(imports, name)) return imports[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename });
  return exports;
}

function navigation(calls) {
  return {
    notFound() {
      calls.notFound += 1;
      throw Object.assign(new Error('Synthetic Next notFound'), { digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
    },
    redirect(destination) {
      calls.redirects.push(destination);
      throw Object.assign(new Error('Synthetic Next redirect'), { digest: 'NEXT_REDIRECT', destination });
    },
  };
}
const is404 = (error) => error.digest === 'NEXT_HTTP_ERROR_FALLBACK;404';

function rootHarness({ savedLocale, acceptLanguage = '' } = {}) {
  const calls = { notFound: 0, redirects: [], cookies: 0, headers: 0 };
  const route = load(routePaths.root, {
    'next/navigation': navigation(calls),
    'next/headers': {
      async cookies() {
        calls.cookies += 1;
        return { get: (name) => name === 'suremandarin_locale' ? { value: savedLocale } : undefined };
      },
      async headers() {
        calls.headers += 1;
        return { get: (name) => name === 'accept-language' ? acceptLanguage : null };
      },
    },
  });
  return { run: (query = {}) => route.default({ searchParams: Promise.resolve(query) }), calls };
}

for (const legacyKey of ['article/80.html', 'industry/', 'gbook/', 'ARTICLE/80.html']) {
  test(`retired root query ${legacyKey} is a 404 before reading language or redirecting`, async () => {
    const { run, calls } = rootHarness({ savedLocale: 'zh', acceptLanguage: 'en' });
    await assert.rejects(() => run({ [legacyKey]: '', ref: 'SYNTHETIC123' }), is404);
    assert.equal(calls.notFound, 1);
    assert.equal(calls.cookies, 0);
    assert.equal(calls.headers, 0);
    assert.deepEqual(calls.redirects, []);
  });
}

test('an encoded legacy query key is rejected after normal URL decoding', async () => {
  const { run, calls } = rootHarness();
  const query = Object.fromEntries(new URLSearchParams('article%2F80.html'));
  await assert.rejects(() => run(query), is404);
  assert.deepEqual(calls.redirects, []);
});

test('root keeps saved locale, referral and repeated campaign parameters without interpreting values as routes', async () => {
  const { run, calls } = rootHarness({ savedLocale: 'zh', acceptLanguage: 'en' });
  await assert.rejects(() => run({
    ref: 'SYNTHETIC123', utm_source: ['email', 'partner'], utm_content: 'article/80.html',
    utm_campaign: '你好 & friends', gbook: 'newsletter', industry: 'education', omitted: undefined,
  }), (error) => {
    assert.equal(error.digest, 'NEXT_REDIRECT');
    const target = new URL(error.destination, 'https://website.example.test');
    assert.equal(target.pathname, '/zh');
    assert.equal(target.searchParams.get('ref'), 'SYNTHETIC123');
    assert.deepEqual(target.searchParams.getAll('utm_source'), ['email', 'partner']);
    assert.equal(target.searchParams.get('utm_content'), 'article/80.html');
    assert.equal(target.searchParams.get('utm_campaign'), '你好 & friends');
    assert.equal(target.searchParams.get('gbook'), 'newsletter');
    assert.equal(target.searchParams.get('industry'), 'education');
    assert.equal(target.searchParams.has('omitted'), false);
    return true;
  });
  assert.equal(calls.notFound, 0);
  assert.equal(calls.headers, 0, 'A saved supported locale still takes precedence over Accept-Language');
});

for (const [label, options, expected] of [
  ['saved English preference', { savedLocale: 'en', acceptLanguage: 'zh-CN' }, '/en'],
  ['Chinese browser preference', { acceptLanguage: 'en;q=0.5,zh-CN;q=0.9' }, '/zh'],
  ['English browser preference', { acceptLanguage: 'en-GB,zh;q=0.2' }, '/en'],
  ['unsupported cookie fallback', { savedLocale: 'fr', acceptLanguage: 'zh-TW' }, '/zh'],
  ['unsupported browser fallback', { acceptLanguage: 'fr,es' }, '/en'],
  ['empty browser fallback', {}, '/en'],
]) {
  test(`root retains ${label} and does not add an empty query`, async () => {
    const { run, calls } = rootHarness(options);
    await assert.rejects(() => run(), (error) => error.digest === 'NEXT_REDIRECT' && error.destination === expected);
    assert.deepEqual(calls.redirects, [expected]);
    assert.equal(calls.notFound, 0);
  });
}

const categories = ['news-and-insights', 'study-tips', 'chinese-culture', 'learning-strategies'];
const syntheticArticle = {
  id: 'synthetic-guide', slug: 'real-guide', title: 'Synthetic Mandarin guide', excerpt: 'Synthetic teaching example.',
  body: 'Synthetic independent article content.', image: '/images/test.webp', authorName: 'SureMandarin',
};
function knowledgeHarness(kind, { article = syntheticArticle } = {}) {
  const calls = { notFound: 0, redirects: [], cms: [], metadata: [] };
  // Deliberately use a normal object with a prototype: an `in` guard would
  // incorrectly allow constructor/toString and fail the regression tests.
  const knowledgeCategories = Object.fromEntries(categories.map((slug) => [slug, {
    en: { title: slug, description: `English ${slug}` }, zh: { title: slug, description: `Chinese ${slug}` },
  }]));
  const element = (type, props) => ({ type, props });
  const component = () => null;
  const route = load(routePaths[kind], {
    'next/navigation': navigation(calls),
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'fragment' },
    '@/lib/i18n': { isLocale: (locale) => locale === 'en' || locale === 'zh' },
    '@/lib/seo': {
      absoluteUrl: (url) => `https://website.example.test${url}`,
      breadcrumbStructuredData: (items) => items,
      pageMetadata: (input) => { calls.metadata.push(input); return input; },
    },
    '@/lib/strapi': {
      knowledgeCategories,
      async getKnowledgeArticles(...args) { calls.cms.push(['list', ...args]); return []; },
      async getArticleLanguagePaths(...args) { calls.cms.push(['translations', ...args]); return []; },
      isIndexableArticle: () => true,
    },
    '@/lib/member-article': {
      async getReadableKnowledgeArticle(...args) { calls.cms.push(['article', ...args]); return article; },
    },
    '@/lib/content-seo': { languagePaths: (input) => input, searchDescription: (excerpt) => excerpt, validContentDate: () => undefined },
    '@/components/knowledge/KnowledgeListing': { KnowledgeListing: component },
    '@/components/knowledge/ArticleDetail': { ArticleDetail: component },
    '@/components/site/SiteShell': { SiteShell: component },
    '@/components/seo/StructuredData': { StructuredData: component },
  });
  return { route, calls };
}

for (const kind of ['category', 'article']) {
  for (const method of ['generateMetadata', 'default']) {
    test(`${kind} ${method} rejects unknown/prototype categories before all CMS reads`, async () => {
      for (const category of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'unknown-category', '', 'Study-Tips']) {
        const { route, calls } = knowledgeHarness(kind);
        await assert.rejects(() => route[method]({ params: Promise.resolve({ lang: 'zh', category, slug: 'real-guide' }) }), is404, category);
        assert.equal(calls.notFound, 1, category);
        assert.deepEqual(calls.cms, [], category);
        assert.deepEqual(calls.metadata, [], category);
      }
    });

    test(`${kind} ${method} still permits each of the four own categories in both locales`, async () => {
      for (const lang of ['en', 'zh']) {
        for (const category of categories) {
          const { route, calls } = knowledgeHarness(kind);
          const result = await route[method]({ params: Promise.resolve({ lang, category, slug: 'real-guide' }) });
          assert.ok(result, `${lang}/${category}`);
          assert.equal(calls.notFound, 0);
          if (method === 'generateMetadata') assert.match(calls.metadata[0].path, new RegExp(`/knowledge/${category}`));
          else assert.ok(calls.cms.length > 0, 'Valid page content still loads');
        }
      }
    });
  }
}

test('an unknown article slug under a real category remains 404 without redirecting to that category', async () => {
  for (const method of ['generateMetadata', 'default']) {
    const { route, calls } = knowledgeHarness('article', { article: null });
    await assert.rejects(() => route[method]({ params: Promise.resolve({ lang: 'zh', category: 'study-tips', slug: 'study-tips' }) }), is404);
    assert.deepEqual(calls.cms, [['article', 'study-tips', 'study-tips', 'zh']]);
    assert.deepEqual(calls.redirects, []);
  }
});
