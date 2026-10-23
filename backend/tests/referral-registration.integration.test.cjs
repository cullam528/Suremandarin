const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createHarness, load, USER, REFERRAL, CREDIT } = require('./helpers/referral-database.cjs');

const local = (name, extra = {}) => ({
  username: name, email: `${name}@example.test`, password: 'Synthetic-Test-Password-123!', ...extra,
});
const count = (h, uid, where = {}) => h.db.query(uid).count({ where });
async function fixture(fn) {
  const h = await createHarness();
  try { await fn(h); } finally { await h.close(); }
}
async function inviter(h, name = 'inviter') {
  const { user } = await h.register(local(name));
  const member = await h.db.query(USER).findOne({ where: { id: user.id } });
  assert.ok(member.referralCode, 'new members get a server-generated invitation code');
  return member;
}
async function assertReferral(h, user, referrer) {
  const rows = await h.db.query(REFERRAL).findMany({
    where: { referredUser: user.id }, populate: { referrer: true, referredUser: true },
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].referrer.id, referrer.id);
  assert.equal(rows[0].referredUser.id, user.id);
  assert.equal(rows[0].referralCode, referrer.referralCode);
  const credits = await h.db.query(CREDIT).findMany({ where: { user: user.id } });
  assert.equal(credits.length, 1);
  assert.equal(Number(credits[0].hours), 1);
  assert.equal(credits[0].status, 'available');
  assert.equal(credits[0].sourceKey, `trial-lesson-v1:${user.id}`);
  assert.equal(Number((await h.db.query(USER).findOne({ where: { id: user.id } })).lessonHoursBalance), 1);
  assert.equal(await count(h, CREDIT, { user: referrer.id }), 0, 'registration alone does not give the inviter a paid-referral reward');
  return rows[0];
}

test('local invitation registration persists one relationship and one trial through the real Strapi auth controller', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const result = await h.register(local('local-invitee', { referredByCode: referrer.referralCode }));
  assert.ok(result.jwt);
  await assertReferral(h, result.user, referrer);
  assert.equal((await h.db.query(USER).findOne({ where: { id: referrer.id } })).referralCount, 1);
}));

test('ordinary and invalid invitation registrations still succeed without relations or rewards', async () => fixture(async (h) => {
  for (const [name, code] of [['ordinary', undefined], ['unknown-code', 'UNKNOWN-CODE'], ['malformed-code', { code: 'forged' }]]) {
    const result = await h.register(local(name, code === undefined ? {} : { referredByCode: code }));
    assert.ok(result.jwt);
    assert.equal(await count(h, REFERRAL, { referredUser: result.user.id }), 0);
    assert.equal(await count(h, CREDIT, { user: result.user.id }), 0);
  }
}));

for (const provider of ['google', 'linkedin', 'twitter']) {
  test(`${provider} invitation registration associates only the newly verified account; login cannot claim a later reward`, async () => fixture(async (h) => {
    const referrer = await inviter(h);
    const email = `${provider}-invitee@example.test`;
    const result = await h.social(provider, email, { mode: 'register', referredByCode: referrer.referralCode });
    assert.ok(result.jwt);
    await assertReferral(h, result.user, referrer);
    const again = await h.social(provider, email, { mode: 'register', referredByCode: referrer.referralCode });
    assert.equal(again.user.id, result.user.id);
    await assertReferral(h, again.user, referrer);

    const existing = await h.social(provider, `existing-${provider}@example.test`, { mode: 'login' });
    const attemptedClaim = await h.social(provider, `existing-${provider}@example.test`, { mode: 'register', referredByCode: referrer.referralCode });
    assert.equal(attemptedClaim.user.id, existing.user.id);
    assert.equal(await count(h, REFERRAL, { referredUser: existing.user.id }), 0);
    assert.equal(await count(h, CREDIT, { user: existing.user.id }), 0);

    const invalid = await h.social(provider, `invalid-${provider}@example.test`, { mode: 'register', referredByCode: 'UNKNOWN-CODE' });
    assert.equal(await count(h, REFERRAL, { referredUser: invalid.user.id }), 0);
    assert.equal(await count(h, CREDIT, { user: invalid.user.id }), 0);
    const ordinary = await h.social(provider, `ordinary-${provider}@example.test`, { mode: 'register' });
    assert.ok(ordinary.jwt);
    assert.equal(await count(h, CREDIT, { user: ordinary.user.id }), 0);
    assert.ok(h.providerCalls.length >= 1);
    assert.ok(h.providerCalls.every((call) => !call.inTransaction), 'provider verification must not occupy a database transaction');
  }));
}

test('same-email cross-provider and repeat local registration cannot create another referral or trial', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const body = local('unique-invitee', { referredByCode: referrer.referralCode });
  const { user } = await h.register(body);
  await assert.rejects(() => h.register(body), /already taken|already registered|exists|unique/i);
  for (const provider of ['google', 'linkedin', 'twitter']) {
    await assert.rejects(() => h.social(provider, body.email.toUpperCase(), { mode: 'register', referredByCode: referrer.referralCode }), /already taken|already registered|exists|unique/i);
  }
  await assertReferral(h, user, referrer);
  assert.equal(await count(h, USER, { email: body.email }), 1);
}));

test('a trial write failure rolls back registration and referral, then a retry succeeds once', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  for (const provider of ['local', 'google']) {
    const email = `rollback-${provider}@example.test`;
    const register = () => provider === 'local'
      ? h.register(local('rollback-local', { referredByCode: referrer.referralCode }))
      : h.social(provider, email, { mode: 'register', referredByCode: referrer.referralCode });
    const before = await count(h, REFERRAL);
    const balanceBefore = (await h.db.query(USER).findOne({ where: { id: referrer.id } })).referralCount;
    const unsubscribe = h.db.lifecycles.subscribe({
      models: [CREDIT], afterCreate() { throw new Error('Synthetic credit storage failure'); },
    });
    try { await assert.rejects(register, /Synthetic credit storage failure/); } finally { unsubscribe(); }
    assert.equal(await count(h, USER, { email }), 0);
    assert.equal(await count(h, REFERRAL), before);
    assert.equal((await h.db.query(USER).findOne({ where: { id: referrer.id } })).referralCount, balanceBefore);
    const result = await register();
    await assertReferral(h, result.user, referrer);
  }
}));

test('database unique keys reject duplicate registration identity, owned invitation codes, relation identity and credit source keys', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const { user } = await h.register(local('constraint-member', { referredByCode: referrer.referralCode }));
  const stored = await h.db.query(USER).findOne({ where: { id: user.id } });
  const referral = await h.db.query(REFERRAL).findOne({ where: { referredUser: user.id } });
  for (const [uid, data] of [
    [USER, { username: 'duplicate-key', email: 'different@example.test', registrationIdentityKey: stored.registrationIdentityKey }],
    [USER, { username: 'duplicate-code', email: 'different@example.test', referralCode: stored.referralCode }],
    [REFERRAL, { referralCode: referrer.referralCode, registrationKey: referral.registrationKey }],
    [REFERRAL, { referralCode: referrer.referralCode, referredIdentityKey: referral.referredIdentityKey }],
    [CREDIT, { hours: 1, sourceKey: `trial-lesson-v1:${user.id}`, grantedAt: new Date() }],
  ]) {
    const metadata = h.db.metadata.get(uid);
    const columns = Object.fromEntries(Object.entries(data).map(([key, value]) => [metadata.attributes[key].columnName, value]));
    // Deliberately bypass application guards: these are genuine DB constraints.
    await assert.rejects(() => h.db.getConnection(metadata.tableName).insert(columns), /unique|duplicate/i,
      `${uid}: ${Object.keys(data).join(', ')}`);
  }
  await assertReferral(h, user, referrer);
}));

test('concurrent registration and callback requests leave one new account, relationship and trial', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const body = local('concurrent-local', { referredByCode: referrer.referralCode });
  const results = await Promise.allSettled([h.register({ ...body }), h.register({ ...body })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const user = results.find((result) => result.status === 'fulfilled').value.user;
  await assertReferral(h, user, referrer);

  const oauth = await Promise.allSettled(Array.from({ length: 3 }, () => h.social('google', 'concurrent-oauth@example.test', {
    mode: 'register', referredByCode: referrer.referralCode,
  })));
  const oauthSuccesses = oauth.filter((result) => result.status === 'fulfilled');
  assert.ok(oauthSuccesses.length >= 1);
  assert.equal(new Set(oauthSuccesses.map((result) => result.value.user.id)).size, 1);
  await assertReferral(h, oauthSuccesses[0].value.user, referrer);
}));

test('client-owned identity, referral and reward fields cannot forge entitlement', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const protectedFields = {
    referralCode: 'ATTACKER-OWN-CODE', registrationIdentityKey: 'chosen-identity',
    referralRewardBalance: 500, referralCount: 500, lessonHoursBalance: 500,
    membershipLevel: 'svip', membershipStatus: 'active',
  };
  await assert.rejects(() => h.register(local('forged-local', protectedFields)), /Invalid parameters|not allowed|protected/i);
  assert.equal(await count(h, USER, { email: 'forged-local@example.test' }), 0);

  const { user } = await h.social('google', 'forged-profile@example.test', {
    mode: 'register', referredByCode: referrer.referralCode,
    ...protectedFields, referredUser: referrer.id, rewardHours: 500,
  }, {
    referralCode: 'ATTACKER-OWN-CODE', registrationIdentityKey: 'chosen-identity',
    referralRewardBalance: 500, referralCount: 500, lessonHoursBalance: 500,
    referredByCode: 'UNKNOWN-CODE',
    referralSource: 'other', referrer: referrer.id, rewardHours: 500,
  });
  const stored = await h.db.query(USER).findOne({ where: { id: user.id } });
  assert.notEqual(stored.referralCode, protectedFields.referralCode);
  assert.notEqual(stored.registrationIdentityKey, protectedFields.registrationIdentityKey);
  assert.equal(Number(stored.referralRewardBalance), 0);
  assert.equal(stored.referralCount, 0);
  assert.equal(stored.membershipLevel, 'registered');
  assert.equal(stored.membershipStatus, 'free');
  await assertReferral(h, user, referrer);
}));

test('a user cannot refer themselves or claim after account creation', async () => fixture(async (h) => {
  const member = await inviter(h);
  await h.registration.createReferralRecord(h.strapi, member, { referredByCode: member.referralCode });
  assert.equal(await count(h, REFERRAL), 0);
  assert.equal(await count(h, CREDIT), 0);
  const referrer = await inviter(h, 'second-inviter');
  const existing = await h.social('linkedin', 'old-account@example.test', { mode: 'login' });
  const repeated = await h.social('linkedin', 'old-account@example.test', { mode: 'register', referredByCode: referrer.referralCode });
  assert.equal(repeated.user.id, existing.user.id);
  assert.equal(await count(h, REFERRAL), 0);
}));

test('public user create/update controllers reject attempts to change server-owned invitation fields', async () => fixture(async (h) => {
  const member = await inviter(h);
  for (const action of ['create', 'update']) {
    for (const field of h.registration.REFERRAL_PROTECTED_FIELDS) {
      const ctx = h.context({ body: { [field]: 'forged' } });
      ctx.state.user = member;
      ctx.params.id = member.id;
      await h.userController[action](ctx);
      assert.equal(ctx.status, 400, `${action} must refuse ${field}`);
    }
  }
  assert.equal(await count(h, USER), 1);
  assert.equal(await count(h, REFERRAL), 0);
  assert.equal(await count(h, CREDIT), 0);
  assert.equal((await h.db.query(USER).findOne({ where: { id: member.id } })).referralCode, member.referralCode);
}));

test('legacy accounts receive only their own sharing code and their email cannot register again', async () => fixture(async (h) => {
  const meta = h.db.metadata.get(USER);
  await h.db.getConnection(meta.tableName).insert({
    username: 'legacy-member', email: 'Legacy@Example.test', provider: 'linkedin',
    document_id: 'legacy-member-document', confirmed: true,
  });
  const member = await h.db.query(USER).findOne({ where: { username: 'legacy-member' } });
  assert.equal(member.registrationIdentityKey, null);
  const first = await h.registration.ensureReferralCode(h.strapi, member.id);
  const second = await h.registration.ensureReferralCode(h.strapi, member.id);
  assert.equal(first, second);
  assert.ok(first);
  assert.equal(await count(h, REFERRAL), 0);
  assert.equal(await count(h, CREDIT), 0);
  await assert.rejects(() => h.social('google', 'legacy@example.test', { mode: 'register', referredByCode: first }), /already taken/i);
  assert.equal(await count(h, USER), 1);
}));

test('repeated relation creation and daily/referral races share a database-enforced single trial', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const result = await h.register(local('retry-member', { referredByCode: referrer.referralCode }));
  const grant = load('src/api/lesson-credit/services/grant.ts');
  await Promise.all(Array.from({ length: 4 }, () => h.registration.createReferralRecord(h.strapi, result.user, { referredByCode: referrer.referralCode })));
  await Promise.all([
    grant.grantUnifiedTrialLesson(h.strapi, { userId: result.user.id, source: 'daily-challenge', notes: 'Daily completion' }),
    grant.grantUnifiedTrialLesson(h.strapi, { userId: result.user.id, source: 'referral', notes: 'Referral completion' }),
  ]);
  await assertReferral(h, result.user, referrer);
  assert.equal((await h.db.query(USER).findOne({ where: { id: referrer.id } })).referralCount, 1);

  const fresh = await inviter(h, 'trial-race');
  const trials = await Promise.all([
    grant.grantUnifiedTrialLesson(h.strapi, { userId: fresh.id, source: 'daily-challenge', notes: 'Daily completion' }),
    grant.grantUnifiedTrialLesson(h.strapi, { userId: fresh.id, source: 'referral', notes: 'Referral completion' }),
  ]);
  assert.equal(trials[0].id, trials[1].id);
  assert.equal(await count(h, CREDIT, { user: fresh.id }), 1);
}));

test('legacy daily and referral trial credits prevent another unified trial regardless of credit status', async () => fixture(async (h) => {
  const grant = load('src/api/lesson-credit/services/grant.ts');
  for (const [index, prefix] of ['daily-7-day-v1', 'referral-trial-v1'].entries()) {
    const member = await inviter(h, `legacy-trial-${index}`);
    const legacy = await grant.grantLessonCredit(h.strapi, {
      userId: member.id, hours: 1, source: 'referral', sourceKey: `${prefix}:${member.id}`, status: 'used',
    });
    const result = await grant.grantUnifiedTrialLesson(h.strapi, { userId: member.id, source: 'referral', notes: 'Retry' });
    assert.equal(result.id, legacy.id);
    assert.equal(await count(h, CREDIT, { user: member.id }), 1);
  }
}));

test('paid referral reward keeps the three-user, refund-window and pending-approval rules and is idempotent', async () => fixture(async (h) => {
  const referrer = await inviter(h);
  const reward = load('src/api/referral/services/referral-rewards.ts');
  const past = new Date(Date.now() - 30 * 86400_000);
  for (const [index, status] of ['paid', 'completed', 'paid', 'refunded', 'recent'].entries()) {
    const { user } = await h.register(local(`paid-invitee-${index}`, { referredByCode: referrer.referralCode }));
    const order = await h.db.query('api::order.order').create({ data: {
      orderNumber: `synthetic-order-${index}`, user: user.id,
      productNameSnapshot: 'Synthetic lesson', unitPrice: 10,
      orderStatus: status === 'completed' ? 'completed' : 'paid',
      paymentStatus: status === 'refunded' ? 'refunded' : 'paid',
      paidAt: status === 'recent' ? new Date() : past,
    } });
    const referral = await h.db.query(REFERRAL).findOne({ where: { referredUser: user.id } });
    await h.db.query(REFERRAL).update({ where: { id: referral.id }, data: { order: order.id } });
    if (index === 1) {
      await reward.evaluateReferralRewards(h.strapi, referrer.id);
      assert.equal(await count(h, CREDIT, { user: referrer.id }), 0);
    }
  }
  const evaluated = await Promise.all(Array.from({ length: 3 }, () => reward.evaluateReferralRewards(h.strapi, referrer.id)));
  for (const result of evaluated) assert.deepEqual(result, { qualified: 3, batches: 1 });
  const credits = await h.db.query(CREDIT).findMany({ where: { user: referrer.id } });
  assert.equal(credits.length, 1);
  assert.equal(Number(credits[0].hours), 2);
  assert.equal(credits[0].status, 'pending-review');
  assert.equal(credits[0].sourceKey, `referral-reward-v1:${referrer.id}:batch:1`);
}));
