const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const now = Date.parse('2026-10-23T00:00:00Z');
class Clock extends Date {
  static now() { return now; }
}
const sandbox = {
  exports: {},
  Date: Clock,
  require(name) {
    assert.equal(name, '@strapi/strapi');
    return { factories: { createCoreController: (_uid, factory) => factory } };
  },
};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, 'testimonial.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, sandbox);

function harness(user) {
  const writes = [];
  const controller = sandbox.exports.default({ strapi: {
    documents(uid) {
      assert.equal(uid, 'api::testimonial.testimonial');
      return { async create(input) { writes.push(input); return { documentId: 'testimonial-1' }; } };
    },
  } });
  const ctx = {
    state: { user },
    request: { body: { quote: 'A useful learning experience.', country: 'CA', rating: 5 } },
    unauthorized: () => ({ status: 401 }),
    forbidden: () => ({ status: 403 }),
  };
  return { controller, ctx, writes };
}

test('normal active VIP, SVIP and trial members can submit one moderated testimonial', async () => {
  for (const membershipLevel of ['vip', 'svip']) {
    for (const membershipStatus of ['active', 'trial']) {
      const { controller, ctx, writes } = harness({ id: 1, membershipLevel, membershipStatus,
        membershipStartedAt: new Date(now - 1).toISOString(),
        membershipExpiresAt: new Date(now + 1).toISOString(),
      });
      await controller.submit(ctx);
      assert.equal(writes.length, 1);
      assert.equal(writes[0].status, 'draft');
      assert.equal(writes[0].data.enabled, false);
      assert.equal(ctx.body.data.documentId, 'testimonial-1');
    }
  }
});

test('cancelled, suspended, expired and invalid memberships cannot use a stale VIP label', async () => {
  const cases = [
    ...['free', 'past-due', 'suspended', 'cancelled', 'expired', 'refunded', undefined].map((membershipStatus) => ({ membershipStatus })),
    { membershipExpiresAt: new Date(now).toISOString() },
    { membershipExpiresAt: new Date(now - 1).toISOString() },
    { membershipExpiresAt: 'invalid-date' },
    { membershipStartedAt: new Date(now + 1).toISOString() },
    { membershipStartedAt: 'invalid-date' },
    { blocked: true },
    { membershipLevel: 'registered' },
  ];
  for (const overrides of cases) {
    const { controller, ctx, writes } = harness({ id: 1, membershipLevel: 'svip', membershipStatus: 'active', ...overrides });
    assert.equal((await controller.submit(ctx)).status, 403, JSON.stringify(overrides));
    assert.equal(writes.length, 0);
  }
});

test('anonymous testimonial requests require login', async () => {
  const { controller, ctx, writes } = harness();
  assert.equal((await controller.submit(ctx)).status, 401);
  assert.equal(writes.length, 0);
});

test('existing active memberships without dates retain the article access convention', async () => {
  const { controller, ctx, writes } = harness({ id: 1, membershipLevel: 'vip', membershipStatus: 'active' });
  await controller.submit(ctx);
  assert.equal(writes.length, 1);
});
