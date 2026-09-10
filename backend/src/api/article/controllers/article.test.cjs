const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Exercise the actual controller methods without a database or live CMS writes.
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'article.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = {
  exports: {},
  require(name) {
    assert.equal(name, '@strapi/strapi');
    return { factories: { createCoreController: (_uid, factory) => factory } };
  },
};
vm.runInNewContext(compiled, sandbox);

const records = [
  { documentId: 'public', accessLevel: 'public', enabled: true, publishedAt: '2026-01-01', body: 'Public body' },
  { documentId: 'legacy', accessLevel: null, enabled: true, publishedAt: '2026-01-01', body: 'Legacy public body' },
  { documentId: 'registered', accessLevel: 'registered', enabled: true, publishedAt: '2026-01-01', body: 'Registered body' },
  { documentId: 'vip', accessLevel: 'vip', enabled: true, publishedAt: '2026-01-01', body: 'VIP body' },
  { documentId: 'svip', accessLevel: 'svip', enabled: true, publishedAt: '2026-01-01', body: 'SVIP body' },
  { documentId: 'disabled', accessLevel: 'public', enabled: false, publishedAt: '2026-01-01', body: 'Disabled body' },
  { documentId: 'draft', accessLevel: 'public', enabled: true, publishedAt: null, body: 'Draft body' },
];

function matches(record, filter) {
  if (filter.$and && !filter.$and.every((part) => matches(record, part))) return false;
  if (filter.$or && !filter.$or.some((part) => matches(record, part))) return false;
  return Object.entries(filter).filter(([key]) => !key.startsWith('$')).every(([key, rule]) => {
    if (rule.$eq !== undefined && record[key] !== rule.$eq) return false;
    if (rule.$in && !rule.$in.includes(record[key])) return false;
    if (rule.$null && record[key] != null) return false;
    return true;
  });
}

function harness({ user, query = {}, id, invalid = false } = {}) {
  const calls = [];
  const eligible = (params) => records.filter((record) => params.status === 'published' && record.publishedAt && matches(record, params.filters));
  const controller = sandbox.exports.default({ strapi: { service: () => ({
    async find(params) {
      calls.push(['find', params]);
      const results = eligible(params);
      return { results, pagination: { total: results.length } };
    },
    async findOne(documentId, params) {
      calls.push(['findOne', params]);
      return eligible(params).find((record) => record.documentId === documentId) ?? null;
    },
  }) } });
  Object.assign(controller, {
    async validateQuery() { calls.push(['validate']); if (invalid) throw new Error('Invalid query'); },
    async sanitizeQuery() { calls.push(['sanitizeQuery']); return query; },
    async sanitizeOutput(value) { calls.push(['sanitizeOutput']); return value; },
    transformResponse(data, meta) { calls.push(['transform']); return { data, meta }; },
  });
  const ctx = {
    state: { user }, params: { id },
    vary: (header) => calls.push(['vary', header]),
    set: (name, value) => calls.push(['header', name, value]),
    notFound: () => ({ status: 404 }),
  };
  return { controller, ctx, calls };
}

test('anonymous list contains only enabled, published public/legacy articles with accurate count', async () => {
  const { controller, ctx, calls } = harness();
  const response = await controller.find(ctx);
  assert.deepEqual(response.data.map((record) => record.documentId), ['public', 'legacy']);
  assert.equal(response.meta.pagination.total, 2);
  assert.deepEqual(calls.filter(([name]) => ['validate', 'sanitizeQuery', 'sanitizeOutput', 'transform'].includes(name)).map(([name]) => name), ['validate', 'sanitizeQuery', 'sanitizeOutput', 'transform']);
});

test('caller OR filters, fields, and draft status cannot override the mandatory predicate', async () => {
  const { controller, ctx, calls } = harness({ query: {
    status: 'draft', fields: ['body'], filters: { $or: [{ accessLevel: { $eq: 'svip' } }, { enabled: { $eq: false } }] },
  } });
  const response = await controller.find(ctx);
  assert.equal(response.data.length, 0);
  assert.equal(calls.find(([name]) => name === 'find')[1].status, 'published');
});

test('registered, active VIP and active SVIP have cumulative access', async () => {
  for (const [membershipLevel, expected] of [['registered', 3], ['vip', 4], ['svip', 5]]) {
    const { controller, ctx, calls } = harness({ user: { id: 1, membershipLevel, membershipStatus: 'active' } });
    const response = await controller.find(ctx);
    assert.equal(response.data.length, expected);
    assert(calls.some(([name, header, value]) => name === 'header' && header === 'Cache-Control' && value === 'private, no-store'));
  }
});

test('expired, invalid-date, future-start, cancelled and suspended memberships grant no premium access', async () => {
  const now = Date.now();
  const cases = [
    { membershipExpiresAt: new Date(now - 1000).toISOString() },
    { membershipExpiresAt: 'not-a-date' },
    { membershipStartedAt: new Date(now + 86400000).toISOString() },
    { membershipStartedAt: 'not-a-date' },
    ...['free', 'past-due', 'suspended', 'cancelled', 'expired', 'refunded'].map((membershipStatus) => ({ membershipStatus })),
  ];
  for (const overrides of cases) {
    const { controller, ctx } = harness({ user: { id: 1, membershipLevel: 'svip', membershipStatus: 'active', ...overrides } });
    assert.equal((await controller.find(ctx)).data.length, 3);
  }
  const trial = harness({ user: { id: 1, membershipLevel: 'vip', membershipStatus: 'trial', membershipExpiresAt: new Date(now + 86400000).toISOString() } });
  assert.equal((await trial.controller.find(trial.ctx)).data.length, 4);
  const blocked = harness({ user: { id: 1, blocked: true, membershipLevel: 'svip', membershipStatus: 'active' } });
  assert.equal((await blocked.controller.find(blocked.ctx)).data.length, 2);
});

test('findOne protects IDs even when only body is requested, preserves output sanitation for an allowed record', async () => {
  for (const id of ['vip', 'svip', 'registered', 'disabled', 'draft', 'missing']) {
    const { controller, ctx } = harness({ id, query: { fields: ['body'] } });
    assert.deepEqual(await controller.findOne(ctx), { status: 404 });
  }
  const { controller, ctx, calls } = harness({ id: 'vip', user: { id: 1, membershipLevel: 'vip', membershipStatus: 'active' } });
  assert.equal((await controller.findOne(ctx)).data.documentId, 'vip');
  assert(calls.some(([name]) => name === 'sanitizeOutput'));
});

test('nested category/articles and unlisted populations cannot expose other article bodies', async () => {
  for (const populate of [
    { category: { populate: { articles: { populate: '*' } } }, cover: true, seo: { populate: '*' }, localizations: true },
    ['category.articles', 'cover', 'seo.shareImage', 'localizations'],
    'category.articles,cover,seo.shareImage,localizations',
    '*',
  ]) {
    const { controller, ctx, calls } = harness({ query: { populate } });
    await controller.find(ctx);
    const guarded = calls.find(([name]) => name === 'find')[1].populate;
    assert.equal(JSON.stringify(guarded), JSON.stringify({ cover: true, category: true, seo: { populate: { shareImage: true } } }));
  }
});

test('invalid caller queries fail before any service read', async () => {
  const { controller, ctx, calls } = harness({ invalid: true });
  await assert.rejects(() => controller.find(ctx), /Invalid query/);
  assert(!calls.some(([name]) => name === 'find'));
});

function relatedController(relativeFile, { singleType = false, populate } = {}) {
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, relativeFile), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {}, require: sandbox.require };
  vm.runInNewContext(output, module);
  const calls = [];
  const service = {
    async find(query) {
      calls.push(['service', query]);
      // Preserve the homepage's required visual data when its image is populated.
      const entity = query.populate.heroSlides ? { heroSlides: [{ image: { url: '/hero.webp' } }] } : { name: 'Public section' };
      return singleType ? entity : { results: [entity], pagination: { total: 1 } };
    },
    async findOne(_id, query) { calls.push(['service', query]); return { name: 'Public section' }; },
  };
  const controller = module.exports.default({ strapi: { service: () => service } });
  Object.assign(controller, {
    async validateQuery() { calls.push(['validate']); },
    async sanitizeQuery() { calls.push(['sanitizeQuery']); return { populate, status: 'draft', locale: 'zh' }; },
    async sanitizeOutput(value) { calls.push(['sanitizeOutput']); return value; },
    transformResponse(data, meta) { return { data, meta }; },
  });
  return { controller, calls, ctx: { params: { id: 'public-section' }, notFound: () => ({ status: 404 }) } };
}

test('category find and findOne deny inverse articles for wildcard, path and object populations', async () => {
  for (const populate of ['*', 'image,articles', ['image', 'articles.body'], { image: true, articles: { populate: '*' } }]) {
    for (const method of ['find', 'findOne']) {
      const { controller, ctx, calls } = relatedController('../../article-category/controllers/article-category.ts', { populate });
      await controller[method](ctx);
      const query = calls.find(([name]) => name === 'service')[1];
      assert.equal(JSON.stringify(query.populate), JSON.stringify({ image: true }));
      assert.equal(query.status, 'published');
      assert.equal(query.locale, 'zh');
      assert(calls.some(([name]) => name === 'sanitizeOutput'));
    }
  }
});

test('homepage denies featured article populations while retaining hero images and SEO share image', async () => {
  for (const populate of [
    '*', 'heroSlides.image,seo.shareImage,featuredArticles',
    ['heroSlides.image', 'seo.shareImage', 'featuredArticles.category.articles'],
    { heroSlides: { populate: 'image' }, seo: { populate: 'shareImage' }, featuredArticles: { populate: '*' } },
  ]) {
    const { controller, ctx, calls } = relatedController('../../home-page/controllers/home-page.ts', { populate, singleType: true });
    const response = await controller.find(ctx);
    const query = calls.find(([name]) => name === 'service')[1];
    assert.equal(query.status, 'published');
    assert.equal(query.locale, 'zh');
    assert(!('featuredArticles' in query.populate));
    assert.equal(JSON.stringify(query.populate.heroSlides), JSON.stringify({ populate: { image: true } }));
    assert.equal(JSON.stringify(query.populate.seo), JSON.stringify({ populate: { shareImage: true } }));
    assert.equal(response.data.heroSlides[0].image.url, '/hero.webp');
    assert(calls.some(([name]) => name === 'sanitizeOutput'));
  }
});

test('app-banner find and findOne cannot expand the article target or deeper course relations', async () => {
  for (const populate of ['*', 'image,course,article', ['image', 'course', 'article.body'], { image: true, course: { populate: '*' }, article: true }]) {
    for (const method of ['find', 'findOne']) {
      const { controller, ctx, calls } = relatedController('../../app-banner/controllers/app-banner.ts', { populate });
      await controller[method](ctx);
      const query = calls.find(([name]) => name === 'service')[1];
      assert.equal(JSON.stringify(query.populate), JSON.stringify({ image: true, course: true }));
      assert.equal(query.status, 'published');
      assert.equal(query.filters.$and[1].enabled.$eq, true);
      assert(calls.some(([name]) => name === 'sanitizeOutput'));
    }
  }
});

test('builtin override endpoint returns only known public guide slugs across all CMS publication/access states', async () => {
  const queries = [];
  const controller = sandbox.exports.default({ strapi: { db: { query: (uid) => {
    assert.equal(uid, 'api::article.article');
    return { async findMany(query) {
      queries.push(query);
      // Include duplicate variants and an unexpected private record to ensure
      // the response whitelist holds independently of the database predicate.
      return [
        { slug: 'how-to-practise-tones', title: 'Private title', body: 'Private body', accessLevel: 'vip' },
        { slug: 'how-to-practise-tones', publishedAt: null },
        { slug: 'hsk-and-real-life-chinese', enabled: false },
        { slug: 'secret-unlisted-post', body: 'Must never appear' },
      ];
    } };
  } } } });
  const response = await controller.builtinOverrides({ query: { locale: 'zh' }, badRequest: () => ({ status: 400 }) });
  assert.equal(JSON.stringify(response), JSON.stringify({ data: ['hsk-and-real-life-chinese', 'how-to-practise-tones'] }));
  assert.equal(queries[0].where.locale, 'zh');
  assert.equal(JSON.stringify(queries[0].select), JSON.stringify(['slug']));
  assert.equal(Object.keys(queries[0].where).sort().join(','), 'locale,slug');
  const guides = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../../../../../frontend/src/lib/editorial-guides.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, guides);
  assert.equal(JSON.stringify([...queries[0].where.slug.$in].sort()), JSON.stringify(Object.keys(guides.exports.editorialGuides).sort()));
});

test('builtin override endpoint rejects arbitrary filters, fields, wildcard/array locales before querying', async () => {
  let reads = 0;
  const controller = sandbox.exports.default({ strapi: { db: { query: () => ({ findMany: async () => { reads += 1; return []; } }) } } });
  for (const query of [{ locale: '*' }, { locale: ['en'] }, { locale: 'fr' }, { locale: 'en', filters: {} }, { fields: ['body'] }, { locale: { $ne: 'en' } }]) {
    const response = await controller.builtinOverrides({ query, badRequest: () => ({ status: 400 }) });
    assert.equal(response.status, 400);
  }
  assert.equal(reads, 0);
  const empty = await controller.builtinOverrides({ query: {}, badRequest: () => ({ status: 400 }) });
  assert.equal(JSON.stringify(empty), JSON.stringify({ data: [] }));
  assert.equal(reads, 1);
});

test('builtin override route is read-only, public and ordered before generic article IDs', () => {
  const routePath = path.join(__dirname, '../routes/01-builtin-overrides.ts');
  const routeModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(routePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, routeModule);
  const [route] = routeModule.exports.default.routes;
  assert.equal(route.method, 'GET');
  assert.equal(route.path, '/articles/builtin-overrides');
  assert.equal(route.config.auth, false);
  assert.equal(route.handler, 'article.builtinOverrides');
  assert(path.basename(routePath) < 'article.ts');
});
