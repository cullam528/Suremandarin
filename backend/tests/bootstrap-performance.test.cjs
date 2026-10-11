const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function load(relativePath, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const sandbox = { exports: {}, ...globals };
  vm.runInNewContext(source, sandbox);
  return sandbox.exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));

// No Strapi instance, database connection, environment files or network access.
function ledger({ members = [], credits = [], readError, writeError } = {}) {
  const implementation = load('src/api/lesson-credit/services/balance.ts');
  const reads = [];
  const writes = [];
  let select;
  const strapi = {
    db: {
      query(uid) {
        if (uid === 'plugin::users-permissions.user') return {
          async findMany(query) { select = plain(query.select); return members; },
          async update(query) {
            assert.equal(implementation.isSyncingLessonBalance(query.where.id), true,
              'The recursion guard must cover every balance write');
            writes.push(plain(query));
            if (writeError) throw writeError;
          },
        };
        assert.equal(uid, 'api::lesson-credit.lesson-credit');
        return {
          async findMany(query) {
            reads.push(plain(query));
            if (readError) throw readError;
            assert.deepEqual(plain(query.where.status.$in), ['available', 'reserved']);
            return credits.filter((credit) => credit.user === query.where.user
              && query.where.status.$in.includes(credit.status));
          },
        };
      },
    },
  };
  return { ...implementation, strapi, reads, writes, select: () => select };
}

test('startup verifies every member ledger but does not write already correct numeric or decimal balances', async () => {
  const mock = ledger({
    members: [{ id: 1, lessonHoursBalance: 0 }, { id: 2, lessonHoursBalance: '3.5000' }],
    credits: [
      { user: 2, status: 'available', hours: '1.5' },
      { user: 2, status: 'reserved', hours: 2 },
      { user: 2, status: 'used', hours: 9 },
      { user: 2, status: 'revoked', hours: 7 },
      { user: 2, status: 'pending', hours: 6 },
    ],
  });
  await mock.syncAllLessonHoursBalances(mock.strapi);
  assert.deepEqual(mock.select(), ['id', 'lessonHoursBalance']);
  assert.deepEqual(mock.reads.map((query) => query.where.user), [1, 2]);
  assert.deepEqual(mock.writes, []);
});

test('startup repairs stale balances using available plus reserved hours without changing credit records', async () => {
  const mock = ledger({
    members: [{ id: 1, lessonHoursBalance: 99 }, { id: 2, lessonHoursBalance: 0 }],
    credits: [
      { user: 1, status: 'available', hours: 1 },
      { user: 1, status: 'reserved', hours: '2.5' },
      { user: 1, status: 'available', hours: -5 },
      { user: 1, status: 'available', hours: 'invalid' },
      { user: 2, status: 'reserved', hours: 1 },
    ],
  });
  await mock.syncAllLessonHoursBalances(mock.strapi);
  assert.deepEqual(mock.writes, [
    { where: { id: 1 }, data: { lessonHoursBalance: 3.5 } },
    { where: { id: 2 }, data: { lessonHoursBalance: 1 } },
  ]);
  assert.equal(mock.isSyncingLessonBalance(1), false);
  assert.equal(mock.isSyncingLessonBalance(2), false);
});

test('missing, null, malformed and negative stored balances are repaired even when the ledger is zero', async () => {
  const values = [undefined, null, '', '  ', 'bad', NaN, Infinity, -1, false];
  const mock = ledger({ members: values.map((lessonHoursBalance, index) => ({ id: index + 1, lessonHoursBalance })) });
  await mock.syncAllLessonHoursBalances(mock.strapi);
  assert.equal(mock.reads.length, values.length);
  assert.equal(mock.writes.length, values.length);
  assert(mock.writes.every((query) => query.data.lessonHoursBalance === 0));
});

test('normal credit mutation reconciliation still writes and releases its lifecycle recursion guard', async () => {
  const mock = ledger({ credits: [{ user: 4, status: 'reserved', hours: 0.5 }] });
  await mock.syncLessonHoursBalance(mock.strapi, 4);
  await mock.syncLessonHoursBalance(mock.strapi, 4);
  assert.equal(mock.writes.length, 2, 'Only bootstrap receives the known stored balance optimization');
  assert.equal(mock.writes[0].data.lessonHoursBalance, 0.5);
  assert.equal(mock.isSyncingLessonBalance(4), false);
});

test('a failed ledger read or repair still rejects bootstrap without silently proceeding to later members', async () => {
  const error = new Error('synthetic database failure');
  for (const operation of ['readError', 'writeError']) {
    const mock = ledger({
      members: [{ id: 1, lessonHoursBalance: 4 }, { id: 2, lessonHoursBalance: 4 }],
      [operation]: error,
    });
    await assert.rejects(() => mock.syncAllLessonHoursBalances(mock.strapi), (caught) => caught === error);
    assert.deepEqual(mock.reads.map((query) => query.where.user), [1]);
    assert.equal(mock.isSyncingLessonBalance(1), false);
    assert.equal(mock.writes.length, operation === 'writeError' ? 1 : 0);
  }
});

test('startup timing preserves results, order and errors without logging task data or error payloads', async () => {
  let now = 1000;
  const { runBootstrapStep } = load('src/utils/bootstrap-step.ts', { Date: { now: () => now } });
  const messages = [];
  const logger = {
    info(message) { messages.push(['info', message]); },
    error(message) { messages.push(['error', message]); },
  };
  const result = { email: 'must-not-appear@example.test', secret: 'not-for-logs' };
  assert.equal(await runBootstrapStep(logger, 'synthetic-success', async () => { now += 250; return result; }), result);
  const originalError = new Error('sensitive-error-payload');
  await assert.rejects(() => runBootstrapStep(logger, 'synthetic-failure', async () => {
    now += 900;
    throw originalError;
  }), (caught) => caught === originalError);
  assert.deepEqual(messages, [
    ['info', '[bootstrap] step=synthetic-success status=started'],
    ['info', '[bootstrap] step=synthetic-success status=ok durationMs=250'],
    ['info', '[bootstrap] step=synthetic-failure status=started'],
    ['error', '[bootstrap] step=synthetic-failure status=failed durationMs=900'],
  ]);
  assert.doesNotMatch(JSON.stringify(messages), /must-not-appear|not-for-logs|sensitive-error-payload/);
});

test('all required startup tasks remain individually awaited in their original sequence before the seed gate', () => {
  const source = fs.readFileSync(path.join(root, 'src/index.ts'), 'utf8');
  const startup = source.slice(source.indexOf('  async bootstrap('), source.indexOf("if (process.env.SEED_INITIAL_DATA"));
  const calls = [...startup.matchAll(/await step\('[^']+', \(\) => (\w+)\(strapi\)\)/g)].map((match) => match[1]);
  assert.deepEqual(calls, [
    'ensureContentLocales', 'migrateArticleBodiesToBlockNote', 'ensureAdminLocalePermissions',
    'ensureEditorMarketingPermissions', 'ensurePublicReadPermissions', 'ensureAccountOverviewPermission',
    'ensureDailyProgressPermission', 'ensureLessonBookingPermission', 'ensureArticleContentManagerLayout',
    'ensureUserContentManagerLayout', 'ensureArticleSeoPermissions', 'syncAllLessonHoursBalances',
    'ensureTestimonialSubmitPermission', 'configurePasswordResetEmail', 'configureSocialProviders',
    'ensureChineseHomePage', 'repairEnglishHomePagePublication',
  ]);
});
