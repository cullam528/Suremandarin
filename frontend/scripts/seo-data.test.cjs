/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS Node test harness for isolated TypeScript modules. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Run the actual CMS loaders and authored content with an isolated fetch stub.
// No Next server, network access, CMS credentials or database writes are used.
const libDirectory = path.join(__dirname, '../src/lib');
const compiled = new Map();
function source(name) {
  if (!compiled.has(name)) {
    compiled.set(name, ts.transpileModule(fs.readFileSync(path.join(libDirectory, `${name}.ts`), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText);
  }
  return compiled.get(name);
}

function loader({ courses = {}, articles = {}, homes = {}, testimonials = {}, failPath, overrideStatus = 200, guardedArticleApi = false } = {}) {
  const modules = new Map();
  const requests = [];
  const cache = (fn) => {
    const results = new Map();
    return (...args) => {
      const key = JSON.stringify(args);
      if (!results.has(key)) results.set(key, fn(...args));
      return results.get(key);
    };
  };
  const fetch = async (input) => {
    const url = new URL(input);
    assert.equal(url.origin, 'https://cms.example.test');
    requests.push(url);
    if (url.pathname === failPath) throw new Error('Simulated CMS outage');
    const locale = url.searchParams.get('locale') || 'en';
    let data;
    let meta;
    if (url.pathname === '/api/courses' || url.pathname === '/api/articles') {
      assert.equal(url.searchParams.get('status'), 'published');
      const collection = url.pathname === '/api/courses' ? courses : articles;
      const records = (collection[locale] || []).filter((record) => record.publishedAt !== null
        && (url.pathname !== '/api/articles' || !guardedArticleApi || (record.enabled !== false && (record.accessLevel == null || record.accessLevel === 'public'))));
      const pageSize = Number(url.searchParams.get('pagination[pageSize]') || 100);
      const page = Number(url.searchParams.get('pagination[page]') || 1);
      data = records.slice((page - 1) * pageSize, page * pageSize);
      meta = { pagination: { page, pageSize, pageCount: Math.ceil(records.length / pageSize), total: records.length } };
    } else if (url.pathname === '/api/articles/builtin-overrides') {
      if (overrideStatus !== 200) return { ok: false, status: overrideStatus, json: async () => ({ error: 'Unavailable endpoint' }) };
      const known = new Set(Object.keys(load('editorial-guides').editorialGuides));
      data = [...new Set((articles[locale] || []).filter((record) => known.has(record.slug)).map((record) => record.slug))];
    } else if (url.pathname === '/api/home-page') data = homes[locale] || null;
    else if (url.pathname === '/api/global-setting') data = null;
    else if (url.pathname === '/api/testimonials') data = testimonials[locale] || [];
    else throw new Error(`Unexpected request: ${url.pathname}`);
    return { ok: true, status: 200, json: async () => ({ data, meta }) };
  };
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const loadedModule = { exports: {} };
    modules.set(name, loadedModule.exports);
    const sandbox = {
      exports: loadedModule.exports, fetch, AbortSignal,
      process: { env: { STRAPI_URL: 'https://cms.example.test' } },
      console: { error() {}, warn() {}, log() {} },
      require(request) {
        if (request === 'react') return { cache };
        assert(request.startsWith('@/lib/'), `Unexpected module: ${request}`);
        return load(request.slice('@/lib/'.length));
      },
    };
    vm.runInNewContext(source(name), sandbox, { filename: `${name}.ts` });
    return loadedModule.exports;
  }
  return { api: load('strapi'), requests };
}

function course(slug, overrides = {}) {
  return {
    documentId: `course-${slug}`, title: `Course ${slug}`, slug,
    summary: `Teacher-led learning for ${slug}.`, category: 'private', enabled: true,
    publishedAt: '2026-08-01T00:00:00.000Z', ...overrides,
  };
}

function article(slug, overrides = {}) {
  return {
    documentId: `article-${slug}`, title: `Learning guide ${slug}`, slug,
    body: 'A useful Mandarin speaking exercise with practical examples. '.repeat(5),
    category: { slug: 'study-tips', name: 'Study Tips' },
    enabled: true, accessLevel: 'public', publishedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

test('course-only catalog stays independent of article outages and reuses cached records', async () => {
  const { api, requests } = loader({ courses: { en: [course('private-course')] }, failPath: '/api/articles' });
  const first = await api.getCourseCatalogData('en');
  const second = await api.getCourseCatalogData('en');
  assert.equal(first, second);
  assert.equal(first[0].slug, 'private-course');
  assert.deepEqual(requests.map((url) => url.pathname), ['/api/courses']);
});

test('course detail reads course/global/testimonial data without pulling home or article content', async () => {
  const { api, requests } = loader({ courses: { en: [course('private-course')] }, failPath: '/api/articles' });
  const detail = await api.getCourseDetailData('private-course', 'en');
  assert.equal(detail.course.slug, 'private-course');
  assert.deepEqual(requests.map((url) => url.pathname).sort(), ['/api/courses', '/api/global-setting', '/api/testimonials']);
});

test('home SEO/settings reads only the home endpoint; contact-style course/global reads stay isolated', async () => {
  const settingsFixture = loader({ homes: { en: { pageTitle: 'Editor title' } }, failPath: '/api/articles' });
  assert.equal((await settingsFixture.api.getHomepageSettings('en')).pageTitle, 'Editor title');
  assert.deepEqual(settingsFixture.requests.map((url) => url.pathname), ['/api/home-page']);
  const contactFixture = loader({ failPath: '/api/articles' });
  await Promise.all([contactFixture.api.getCourseCatalogData('en'), contactFixture.api.getGlobalData('en')]);
  assert.deepEqual(contactFixture.requests.map((url) => url.pathname).sort(), ['/api/courses', '/api/global-setting']);
});

test('homepage requests only four category-cover fields instead of the paginated article bodies', async () => {
  const { api, requests } = loader();
  const data = await api.getHomepageData('en');
  assert.equal(data.articles.length, 4);
  const articleRequests = requests.filter((url) => url.pathname === '/api/articles');
  assert.equal(articleRequests.length, 1);
  const params = articleRequests[0].searchParams;
  assert.equal(params.get('pagination[pageSize]'), '4');
  assert.equal(params.get('fields[0]'), 'slug');
  assert.equal(params.get('fields[1]'), 'imageAlt');
  assert.equal(params.get('populate[cover]'), 'true');
  assert.equal(params.has('populate[category]'), false);
  assert.equal(params.has('populate[seo][populate]'), false);
  assert.equal([...params.keys()].filter((key) => key.startsWith('filters[slug][$in]')).length, 4);
});

test('testimonial-only reads do not fabricate reviews or default an unknown verification to true', async () => {
  const empty = loader({ failPath: '/api/articles' });
  assert.equal((await empty.api.getTestimonialsData('en')).length, 0);
  assert.deepEqual(empty.requests.map((url) => url.pathname), ['/api/testimonials']);
  const populated = loader({ testimonials: { en: [{ documentId: 'student-review', studentName: 'Real Student', quote: 'My experience.', rating: 4 }] } });
  const result = await populated.api.getTestimonialsData('en');
  assert.equal(result[0].name, 'Real Student');
  assert.equal(result[0].verified, false);
});

test('empty or entirely disabled catalogs do not resurrect six default courses', async () => {
  for (const courses of [{}, { en: [course('private-course', { enabled: false })], zh: [] }]) {
    const { api } = loader({ courses });
    for (const locale of ['en', 'zh']) {
      assert.equal((await api.getHomepageData(locale)).courses.length, 0);
      assert.equal(await api.getCourseDetailData('private-course', locale), null);
    }
  }
});

test('a published enabled English course activates only its authored Chinese version and matching detail', async () => {
  const english = course('private-course', { seo: { metaTitle: 'English-only SEO title', noIndex: true } });
  const { api } = loader({ courses: { en: [english], zh: [] } });
  const chinese = (await api.getHomepageData('zh')).courses;
  assert.equal(chinese.length, 1);
  assert.equal(chinese[0].slug, 'private-course');
  assert.equal(chinese[0].id, english.documentId);
  assert.match(chinese[0].title, /一对一/);
  assert.match(chinese[0].summary, /[\u3400-\u9fff]/);
  assert.equal(chinese[0].seo.noIndex, true);
  assert.equal(chinese[0].seo.metaTitle, undefined);
  const detail = await api.getCourseDetailData('private-course', 'zh');
  assert.equal(detail.course.title, chinese[0].title);
  assert.equal(detail.course.summary, chinese[0].summary);
  const draft = loader({ courses: { en: [course('private-course', { publishedAt: null })] } });
  assert.equal((await draft.api.getHomepageData('zh')).courses.length, 0);
});

test('an explicitly disabled Chinese course suppresses the authored translation fallback', async () => {
  const { api } = loader({ courses: {
    en: [course('private-course')],
    zh: [course('private-course', { enabled: false, title: '已关闭的中文课程' })],
  } });
  assert.equal((await api.getHomepageData('en')).courses.length, 1);
  assert.equal((await api.getHomepageData('zh')).courses.length, 0);
  assert.equal(await api.getCourseDetailData('private-course', 'zh'), null);
});

test('course seven stays in the catalog and never inherits course one SEO; missing slugs return null', async () => {
  const records = Array.from({ length: 7 }, (_, index) => course(`custom-course-${index + 1}`));
  records[0].seo = { metaTitle: 'First course SEO', noIndex: true };
  const { api } = loader({ courses: { en: records } });
  assert.equal((await api.getHomepageData('en')).courses.length, 7);
  const detail = await api.getCourseDetailData('custom-course-7', 'en');
  assert.equal(detail.course.id, records[6].documentId);
  assert.equal(detail.course.title, records[6].title);
  assert.equal(detail.course.summary, records[6].summary);
  assert.equal(detail.course.seo, undefined);
  assert.equal(await api.getCourseDetailData('does-not-exist', 'en'), null);
  assert.equal((await api.getHomepageData('zh')).courses.length, 0);
});

test('public article readers exclude VIP, registered, disabled and wrong-category records', async () => {
  const { api } = loader({ articles: { en: [
    article('open-post'), article('vip-post', { accessLevel: 'vip' }),
    article('member-post', { accessLevel: 'registered' }), article('disabled-post', { enabled: false }),
    article('study-tips', { category: { slug: 'chinese-culture', name: 'Chinese Culture' } }),
  ] } });
  assert(await api.getKnowledgeArticle('open-post', 'study-tips', 'en'));
  for (const slug of ['vip-post', 'member-post', 'disabled-post', 'study-tips']) {
    assert.equal(await api.getKnowledgeArticle(slug, 'study-tips', 'en'), null);
  }
  assert(await api.getKnowledgeArticle('study-tips', 'chinese-culture', 'en'));
});

test('article pagination retrieves more than 100 records without the former 12-entry cap', async () => {
  const records = Array.from({ length: 105 }, (_, index) => article(`page-test-${index + 1}`));
  const { api, requests } = loader({ articles: { en: records } });
  const results = await api.getKnowledgeArticles('study-tips', 'en');
  assert.equal(results.filter((item) => item.slug.startsWith('page-test-')).length, 105);
  assert.equal((await api.getKnowledgeArticle('page-test-105', 'study-tips', 'en')).id, records[104].documentId);
  const pages = requests.filter((url) => url.pathname === '/api/articles').map((url) => Number(url.searchParams.get('pagination[page]')));
  assert.deepEqual(pages, [1, 2]);
});

test('CMS SEO title, description, image and noIndex map to home, course and article data', async () => {
  const seo = { metaTitle: '  Editor title  ', metaDescription: '  Editor description  ', noIndex: true, shareImage: { url: 'https://assets.example.test/social.webp' } };
  const { api } = loader({
    homes: { en: { pageTitle: 'Homepage', seo } },
    courses: { en: [course('private-course', { seo })] },
    articles: { en: [article('edited-post', { seo })] },
  });
  const home = await api.getHomepageData('en');
  const detail = await api.getCourseDetailData('private-course', 'en');
  const post = await api.getKnowledgeArticle('edited-post', 'study-tips', 'en');
  for (const value of [home.seo, detail.course.seo, post.seo]) {
    assert.equal(value.metaTitle, 'Editor title');
    assert.equal(value.metaDescription, 'Editor description');
    assert.equal(value.shareImage, 'https://assets.example.test/social.webp');
    assert.equal(value.noIndex, true);
  }
  assert.equal(api.isIndexableArticle(post), false);
});

test('translated article URLs match document ID even when slugs differ', async () => {
  const { api } = loader({ articles: {
    en: [article('english-tone-guide', { documentId: 'translated-document' })],
    zh: [article('zhongwen-shengdiao', { documentId: 'translated-document', title: '声调练习' })],
  } });
  const english = await api.getKnowledgeArticle('english-tone-guide', 'study-tips', 'en');
  const paths = await api.getArticleLanguagePaths(english, 'study-tips', 'en');
  assert.equal(paths.length, 2);
  assert.equal(paths.find((item) => item.locale === 'zh').path, '/zh/knowledge/study-tips/zhongwen-shengdiao');
  const chinese = await api.getKnowledgeArticle('zhongwen-shengdiao', 'study-tips', 'zh');
  const reverse = await api.getArticleLanguagePaths(chinese, 'study-tips', 'zh');
  assert.equal(reverse.find((item) => item.locale === 'en').path, '/en/knowledge/study-tips/english-tone-guide');
});

test('curated code-managed guides retain authored content without fabricated publication dates', async () => {
  const { api } = loader();
  for (const locale of ['en', 'zh']) {
    const guides = (await Promise.all(Object.keys(api.knowledgeCategories).map((category) => api.getKnowledgeArticles(category, locale)))).flat();
    const indexable = guides.filter(api.isIndexableArticle);
    assert.equal(indexable.length, 8);
    for (const guide of indexable) {
      assert.equal(guide.publishDate, '');
      assert.equal(guide.updatedAt, undefined);
      assert.match(guide.body, /\n## /);
    }
    assert(guides.filter((guide) => guide.isSample).every((guide) => guide.seo.noIndex === true));
  }
});

test('CMS transport failures reject instead of publishing a successful fallback response', async () => {
  const { api } = loader({ failPath: '/api/articles' });
  await assert.rejects(() => api.getKnowledgeArticles('study-tips', 'en'), /Simulated CMS outage/);
  await assert.rejects(() => api.getHomepageData('en'), /Simulated CMS outage/);
});

test('a withdrawn curated CMS guide cannot resurrect through code fallback when the public API hides it', async () => {
  for (const overrides of [{ enabled: false }, { accessLevel: 'vip' }, { publishedAt: null }]) {
    const { api, requests } = loader({
      guardedArticleApi: true,
      articles: { en: [article('how-to-practise-tones', overrides)] },
    });
    assert.equal(await api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'en'), null);
    assert(!(await api.getKnowledgeArticles('study-tips', 'en')).some((item) => item.slug === 'how-to-practise-tones'));
    assert(requests.some((url) => url.pathname === '/api/articles/builtin-overrides'));
  }
});

test('builtin CMS ownership is locale-specific and published CMS content continues to win', async () => {
  const { api } = loader({ guardedArticleApi: true, articles: {
    en: [article('how-to-practise-tones', { title: 'Updated by the editor', body: 'CMS lesson text with a corrected tone exercise.' })],
    zh: [article('how-to-practise-tones', { enabled: false })],
  } });
  const english = await api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'en');
  assert.equal(english.title, 'Updated by the editor');
  assert.equal(english.body, 'CMS lesson text with a corrected tone exercise.');
  assert.equal(await api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'zh'), null);
  const chineseOnly = loader({ guardedArticleApi: true, articles: { zh: [article('how-to-practise-tones', { publishedAt: null })] } });
  assert(chineseOnly.api.isIndexableArticle(await chineseOnly.api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'en')));
});

test('an old backend 404 permits staggered deployment, but override endpoint outages do not recreate withdrawn guides', async () => {
  const older = loader({ overrideStatus: 404 });
  assert(older.api.isIndexableArticle(await older.api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'en')));
  const outage = loader({ overrideStatus: 503 });
  await assert.rejects(() => outage.api.getKnowledgeArticle('how-to-practise-tones', 'study-tips', 'en'), /Strapi request failed: 503/);
});
