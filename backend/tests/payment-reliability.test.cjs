const assert = require('node:assert/strict');
const { test } = require('node:test');
const { harness, context, capture, activation, pendingOrder, pendingSubscription, UID } = require('./helpers/payment-harness.cjs');

async function invoke(action, ctx) {
  try { await action(ctx); }
  catch (error) { ctx.status = error.status ?? 500; ctx.error = error; }
  return ctx;
}

test('a new zero-initialized order records the verified PayPal captured amount', async () => {
  const h = harness();
  const createContext = context({ productType: 'course', courseDocumentId: 'course-1' });
  await h.controller.createPayPalOrder(createContext);
  assert.equal(h.rows(UID.order)[0].paidAmount, 0, 'The unpaid order starts with zero collected');
  const captureContext = context({ paypalOrderId: createContext.body.paypalOrderId });
  await h.controller.capturePayPalOrder(captureContext);
  assert.equal(Number(h.rows(UID.order)[0].paidAmount), 39.95);
  assert.equal(h.rows(UID.order)[0].paymentStatus, 'paid');
  const accountContext = context();
  await h.controller.accountOverview(accountContext);
  assert.equal(Number(accountContext.body.orders[0].paidAmount), 39.95);
});

test('a failed subscription webhook can recover when PayPal retries the same event', async () => {
  const h = harness({ subscriptions: [pendingSubscription()] });
  h.failNext(UID.user, 'update');
  const first = context(activation(), null);
  await h.controller.paypalWebhook(first);
  assert.equal(h.rows(UID.event)[0].processed, false);
  assert(first.status >= 500, 'PayPal must be told to retry failed business processing');
  const retry = context(activation(), null);
  await h.controller.paypalWebhook(retry);
  assert.equal(h.rows(UID.event)[0].processed, true, 'An existing failed event must not be acknowledged as a completed duplicate');
  assert.equal(h.rows(UID.event)[0].processingAttempts, 2);
  assert.equal(h.rows(UID.user)[0].membershipStatus, 'active');
});

test('completed capture and account overview retain the exact provider amount and currency', async () => {
  const h = harness({ orders: [pendingOrder()] });
  const ctx = context({ paypalOrderId: 'PAYPAL-ORDER-1' });
  await h.controller.capturePayPalOrder(ctx);
  const order = h.rows(UID.order)[0];
  assert.equal(Number(order.paidAmount), 39.95);
  assert.equal(order.currency, 'USD');
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(Number(h.rows(UID.transaction)[0].settledAmount), 39.95);
  assert.equal(h.rows(UID.credit).length, 1);
  assert.equal(h.rows(UID.credit)[0].hours, 4);
});

test('unconfirmed captures do not mark orders paid or grant lessons', async () => {
  for (const status of ['CREATED', 'APPROVED', 'PENDING', 'VOIDED']) {
    const h = harness({ orders: [pendingOrder()], paypal: { async captureOrder() { return capture({ status }); } } });
    await invoke(h.controller.capturePayPalOrder, context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
    assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid', status);
    assert.equal(h.rows(UID.credit).length, 0, status);
    assert.equal(h.rows(UID.transaction).length, 0, status);
  }
});

test('completed order status alone never proves a payment: capture amount, currency, and ownership must agree', async () => {
  const badResults = [
    ['underpayment', (r) => { r.purchase_units[0].payments.captures[0].amount.value = '39.94'; }],
    ['overpayment', (r) => { r.purchase_units[0].payments.captures[0].amount.value = '39.96'; }],
    ['wrong currency', (r) => { r.purchase_units[0].payments.captures[0].amount.currency_code = 'EUR'; }],
    ['missing capture', (r) => { r.purchase_units[0].payments.captures = []; }],
    ['malformed amount', (r) => { r.purchase_units[0].payments.captures[0].amount.value = '39.9501'; }],
    ['wrong order', (r) => { r.id = 'ANOTHER-PAYPAL-ORDER'; }],
    ['wrong internal order', (r) => { r.purchase_units[0].custom_id = 'SM-OTHER'; r.purchase_units[0].reference_id = 'SM-OTHER'; }],
  ];
  for (const [description, mutate] of badResults) {
    const result = capture(); mutate(result);
    const h = harness({ orders: [pendingOrder()], paypal: { async captureOrder() { return result; } } });
    const ctx = await invoke(h.controller.capturePayPalOrder, context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
    assert(ctx.status >= 400, description);
    assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid', description);
    assert.equal(h.rows(UID.credit).length, 0, description);
    assert.equal(h.rows(UID.transaction).length, 0, description);
  }
});

test('a member cannot capture another member’s order and unauthenticated capture is rejected', async () => {
  for (const user of [null, { id: 99 }]) {
    const h = harness({ orders: [pendingOrder()] });
    const ctx = await invoke(h.controller.capturePayPalOrder, context({ paypalOrderId: 'PAYPAL-ORDER-1' }, user));
    assert([401, 404].includes(ctx.status));
    assert.equal(h.providerCalls.length, 0);
    assert.equal(h.rows(UID.credit).length, 0);
  }
});

test('sequential and simultaneous captures settle once and grant lesson hours once', async () => {
  const h = harness({ orders: [pendingOrder()] });
  const contexts = Array.from({ length: 5 }, () => context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  await Promise.all(contexts.map((ctx) => h.controller.capturePayPalOrder(ctx)));
  await h.controller.capturePayPalOrder(context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(h.rows(UID.credit).length, 1);
  assert.equal(Number(h.rows(UID.order)[0].paidAmount), 39.95);
  assert(contexts.every((ctx) => ctx.status < 400));
});

test('a failed lesson grant rolls back settlement and recovers without double charging or double granting', async () => {
  const h = harness({ orders: [pendingOrder()] });
  h.failNext(UID.credit, 'create');
  const first = await invoke(h.controller.capturePayPalOrder, context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  assert(first.status >= 500);
  assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid');
  assert.equal(h.rows(UID.transaction).length, 0);
  assert.equal(h.rows(UID.credit).length, 0);
  const retry = await invoke(h.controller.capturePayPalOrder, context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  assert.equal(retry.status, 200);
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(h.rows(UID.credit).length, 1);
  const captureCalls = h.providerCalls.filter((call) => call.method === 'captureOrder');
  assert(captureCalls.every((call) => !call.requestId || call.requestId === 'SM-TEST-1-capture'));
});

test('account overview does not fabricate collected money from list price', async () => {
  const h = harness({ orders: [pendingOrder({ paidAmount: null, paymentStatus: 'paid', orderStatus: 'paid' })] });
  const ctx = context(); await h.controller.accountOverview(ctx);
  assert.notEqual(Number(ctx.body.orders[0].paidAmount), 39.95, 'Historical missing amounts require reconciliation, not an assumed list price');
});

test('verified membership activation grants the expected bounded VIP rights once across duplicate deliveries', async () => {
  const h = harness({ subscriptions: [pendingSubscription()] });
  const deliveries = Array.from({ length: 4 }, () => context(activation(), null));
  await Promise.all(deliveries.map((ctx) => h.controller.paypalWebhook(ctx)));
  const member = h.rows(UID.user)[0];
  assert.equal(member.membershipStatus, 'active');
  assert.equal(member.membershipLevel, 'vip');
  assert(member.membershipExpiresAt);
  assert.deepEqual(h.rows(UID.entitlement).map((item) => item.code).sort(), ['article.vip.read', 'course.basic.access', 'video.download']);
  assert(h.rows(UID.entitlement).every((item) => item.expiresAt));
  assert.equal(h.rows(UID.event).length, 1);
  assert.equal(h.rows(UID.event)[0].processed, true);
  assert.equal(h.rows(UID.event)[0].processingAttempts, 4, 'Each overlapping delivery attempted processing before the successful commit');
  await h.controller.paypalWebhook(context(activation(), null));
  assert.equal(h.rows(UID.event)[0].processingAttempts, 4, 'A completed duplicate is acknowledged without another attempt');
  assert.equal(h.rows(UID.transaction).length, 0, 'Activation is not a payment receipt');
  assert.equal(member.lastPaymentAt, undefined, 'Activation alone must not invent payment facts');
});

test('a failure after membership update rolls back rights, then the same delivery restores them exactly once', async () => {
  const h = harness({ subscriptions: [pendingSubscription()] });
  h.failNext(UID.entitlement, 'create');
  const failed = await invoke(h.controller.paypalWebhook, context(activation(), null));
  assert(failed.status >= 500);
  assert.equal(h.rows(UID.subscription)[0].status, 'suspended');
  assert.equal(h.rows(UID.user)[0].membershipStatus, 'inactive');
  assert.equal(h.rows(UID.entitlement).length, 0);
  assert.equal(h.rows(UID.event)[0].processed, false);
  await h.controller.paypalWebhook(context(activation(), null));
  assert.equal(h.rows(UID.user)[0].membershipStatus, 'active');
  assert.equal(h.rows(UID.entitlement).length, 3);
  assert.equal(h.rows(UID.event)[0].processingAttempts, 2);
});

test('invalid webhook signatures are rejected before creating durable state', async () => {
  const h = harness({ subscriptions: [pendingSubscription()], paypal: { async verifyWebhook() { return false; } } });
  const ctx = context(activation(), null);
  await h.controller.paypalWebhook(ctx);
  assert.equal(ctx.status, 401);
  assert.equal(h.rows(UID.event).length, 0);
  assert.equal(h.rows(UID.user)[0].membershipStatus, 'inactive');
});

test('a known subscription event arriving before its local subscription is retryable', async () => {
  const h = harness();
  const ctx = await invoke(h.controller.paypalWebhook, context(activation(), null));
  assert(ctx.status >= 500);
  assert.equal(h.rows(UID.event)[0].processed, false);
});

test('unsupported signed event types are acknowledged without granting access', async () => {
  const h = harness({ subscriptions: [pendingSubscription()] });
  const ctx = context(activation({ event_type: 'CATALOG.PRODUCT.CREATED' }), null);
  await h.controller.paypalWebhook(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(h.rows(UID.event)[0].processed, true);
  assert.equal(h.rows(UID.entitlement).length, 0);
});

test('subscription cancellation revokes its rights and duplicate cancellation creates no payments', async () => {
  let current = activation().resource;
  const h = harness({ subscriptions: [pendingSubscription()], paypal: { async getSubscription() { return current; } } });
  await h.controller.paypalWebhook(context(activation(), null));
  current = { ...current, status: 'CANCELLED', status_update_time: '2026-10-23T01:00:00Z' };
  const cancelled = activation({ id: 'WH-CANCELLED-1', event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: '2026-10-23T01:00:00Z', resource: current });
  await h.controller.paypalWebhook(context(cancelled, null));
  await h.controller.paypalWebhook(context(cancelled, null));
  assert.equal(h.rows(UID.subscription)[0].status, 'cancelled');
  assert.equal(h.rows(UID.user)[0].autoRenew, false);
  assert.equal(h.rows(UID.entitlement).filter((item) => item.status === 'active').length, 0);
  assert.equal(h.rows(UID.transaction).length, 0);
});

test('an old activation delivered after cancellation cannot reactivate a terminal subscription', async () => {
  let current = { ...activation().resource, status: 'CANCELLED', status_update_time: '2026-10-23T01:00:00Z' };
  const h = harness({ subscriptions: [pendingSubscription()], paypal: { async getSubscription() { return current; } } });
  await h.controller.paypalWebhook(context(activation({ id: 'WH-CANCELLED-1', event_type: 'BILLING.SUBSCRIPTION.CANCELLED',
    create_time: current.status_update_time, resource: current }), null));
  current = activation().resource;
  await h.controller.paypalWebhook(context(activation({ id: 'WH-DELAYED-ACTIVATION' }), null));
  assert.equal(h.rows(UID.subscription)[0].status, 'cancelled');
  assert.equal(h.rows(UID.entitlement).filter((item) => item.status === 'active').length, 0);
});

test('provider subscription identity, plan, freshness, and bounded expiry are required before granting rights', async () => {
  for (const overrides of [
    { id: 'I-OTHER' }, { custom_id: 'subscription-other' }, { plan_id: 'P-OTHER' },
    { status_update_time: undefined }, { billing_info: {} },
    { billing_info: { next_billing_time: '2000-01-01T00:00:00Z' } },
  ]) {
    const h = harness({ subscriptions: [pendingSubscription()], paypal: { async getSubscription() { return { ...activation().resource, ...overrides }; } } });
    const ctx = await invoke(h.controller.paypalWebhook, context(activation(), null));
    assert(ctx.status >= 400, JSON.stringify(overrides));
    assert.equal(h.rows(UID.entitlement).length, 0);
    assert.equal(h.rows(UID.user)[0].membershipStatus, 'inactive');
  }
});

const sale = (overrides = {}) => ({
  id: 'WH-SALE-1', event_type: 'PAYMENT.SALE.COMPLETED', create_time: '2026-10-23T01:00:00Z',
  resource: { id: 'SALE-1', state: 'completed', billing_agreement_id: 'I-SUBSCRIPTION-1',
    create_time: '2026-10-23T01:00:00Z', amount: { total: '39.95', currency: 'USD' } }, ...overrides,
});
const captureEvent = (overrides = {}) => ({
  id: 'WH-CAPTURE-1', event_type: 'PAYMENT.CAPTURE.COMPLETED', create_time: '2026-10-23T00:00:00Z',
  resource: { id: 'CAPTURE-1', supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-1' } } }, ...overrides,
});

test('subscription sale refreshes the paid period and repeated sale IDs create one payment fact', async () => {
  const h = harness({ subscriptions: [pendingSubscription()] });
  await h.controller.paypalWebhook(context(activation(), null));
  await h.controller.paypalWebhook(context(sale(), null));
  await h.controller.paypalWebhook(context(sale({ id: 'WH-SAME-SALE-SECOND-EVENT' }), null));
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(Number(h.rows(UID.transaction)[0].settledAmount), 39.95);
  assert.equal(h.rows(UID.transaction)[0].subscription, 'subscription-1');
  assert.equal(h.rows(UID.subscription)[0].lastPaidAt, '2026-10-23T01:00:00.000Z');
  assert.equal(h.rows(UID.user)[0].lastPaymentAt, '2026-10-23T01:00:00.000Z');
  assert.equal(h.rows(UID.entitlement).length, 3);
});

test('subscription sale amount and currency mismatches remain retryable without writing payment facts', async () => {
  for (const amount of [{ total: '0', currency: 'USD' }, { total: '39.94', currency: 'USD' }, { total: '39.95', currency: 'EUR' }]) {
    const h = harness({ subscriptions: [pendingSubscription()] });
    const ctx = context(sale({ resource: { ...sale().resource, amount } }), null);
    await h.controller.paypalWebhook(ctx);
    assert.equal(ctx.status, 503);
    assert.equal(h.rows(UID.event)[0].processed, false);
    assert.equal(h.rows(UID.transaction).length, 0);
    assert.equal(h.rows(UID.user)[0].lastPaymentAt, undefined);
  }
});

test('an older renewal snapshot cannot shorten an already verified future membership period', async () => {
  const previousEnd = '2099-12-23T00:00:00Z';
  const h = harness({ subscriptions: [pendingSubscription({ status: 'active', startedAt: '2026-10-23T00:00:00Z',
    currentPeriodEnd: previousEnd, nextBillingAt: previousEnd, lastPaypalEventAt: '2026-10-23T00:00:00.000Z' })] });
  await h.controller.paypalWebhook(context(sale(), null));
  assert.equal(Date.parse(h.rows(UID.subscription)[0].currentPeriodEnd), Date.parse(previousEnd));
  assert.equal(h.rows(UID.transaction).length, 1);
});

test('cancelling one subscription preserves another valid subscription and its rights', async () => {
  const other = pendingSubscription({ id: 12, documentId: 'subscription-2', externalSubscriptionId: 'I-SUBSCRIPTION-2',
    status: 'active', startedAt: '2026-10-23T00:00:00Z', currentPeriodEnd: '2099-12-23T00:00:00Z' });
  const snapshot = { ...activation().resource, status: 'CANCELLED', status_update_time: '2026-10-23T01:00:00Z' };
  const h = harness({ subscriptions: [pendingSubscription(), other],
    entitlements: [{ id: 23, documentId: 'entitlement-other', user: 7, subscription: 'subscription-2', source: 'membership',
      code: 'article.vip.read', status: 'active', expiresAt: other.currentPeriodEnd }],
    paypal: { async getSubscription() { return snapshot; } },
  });
  const ctx = context(activation({ id: 'WH-CANCELLED-1', event_type: 'BILLING.SUBSCRIPTION.CANCELLED', resource: snapshot }), null);
  await h.controller.paypalWebhook(ctx);
  assert.equal(ctx.status, 200);
  assert.equal(h.rows(UID.user)[0].membershipStatus, 'active');
  assert.equal(h.rows(UID.user)[0].membershipLevel, 'vip');
  assert.equal(h.rows(UID.entitlement)[0].status, 'active');
});

test('capture webhook and browser success share one settlement and lesson grant', async () => {
  const h = harness({ orders: [pendingOrder()] });
  const webhook = context(captureEvent(), null);
  await h.controller.paypalWebhook(webhook);
  assert.equal(webhook.status, 200);
  assert.equal(h.rows(UID.event)[0].processed, true);
  const browser = context({ paypalOrderId: 'PAYPAL-ORDER-1' });
  await h.controller.capturePayPalOrder(browser);
  assert.equal(browser.status, 200);
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(h.rows(UID.credit).length, 1);
});

test('a capture webhook whose authenticated snapshot is pending remains unprocessed for retry', async () => {
  const result = capture(); result.purchase_units[0].payments.captures[0].status = 'PENDING';
  const h = harness({ orders: [pendingOrder()], paypal: { async getOrder() { return result; } } });
  const ctx = context(captureEvent(), null);
  await h.controller.paypalWebhook(ctx);
  assert.equal(ctx.status, 503);
  assert.equal(h.rows(UID.event)[0].processed, false);
  assert.equal(h.rows(UID.transaction).length, 0);
  assert.equal(h.rows(UID.credit).length, 0);
});

test('capture webhook processing failure rolls back nested settlement, then identical-event retry recovers', async () => {
  const h = harness({ orders: [pendingOrder()] });
  h.failNext(UID.credit, 'create');
  const failed = context(captureEvent(), null); await h.controller.paypalWebhook(failed);
  assert.equal(failed.status, 503);
  assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid');
  assert.equal(h.rows(UID.transaction).length, 0);
  assert.equal(h.rows(UID.event)[0].processed, false);
  const retried = context(captureEvent(), null); await h.controller.paypalWebhook(retried);
  assert.equal(retried.status, 200);
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(h.rows(UID.credit).length, 1);
  assert.equal(h.rows(UID.event)[0].processed, true);
});

test('a future or invalid manual membership start cannot override currently active PayPal membership', async () => {
  for (const membershipStartedAt of ['2099-01-01T00:00:00Z', 'invalid-date']) {
    const h = harness({ subscriptions: [pendingSubscription()], user: {
      membershipChannel: 'manual', membershipLevel: 'svip', membershipStatus: 'active',
      membershipStartedAt, membershipExpiresAt: '2099-12-23T00:00:00Z',
    } });
    const ctx = context(activation(), null); await h.controller.paypalWebhook(ctx);
    assert.equal(ctx.status, 200);
    assert.equal(h.rows(UID.user)[0].membershipLevel, 'vip');
    assert.equal(h.rows(UID.user)[0].membershipChannel, 'paypal');
    assert.equal(h.rows(UID.user)[0].membershipStatus, 'active');
  }
});

test('an already valid higher-level manual membership is preserved while PayPal tracks its own rights', async () => {
  const h = harness({ subscriptions: [pendingSubscription()], user: {
    membershipChannel: 'manual', membershipLevel: 'svip', membershipStatus: 'active',
    membershipStartedAt: '2026-10-01T00:00:00Z', membershipExpiresAt: '2099-12-23T00:00:00Z',
  } });
  await h.controller.paypalWebhook(context(activation(), null));
  assert.equal(h.rows(UID.user)[0].membershipLevel, 'svip');
  assert.equal(h.rows(UID.user)[0].membershipChannel, 'manual');
  assert.equal(h.rows(UID.entitlement).length, 3);
});
