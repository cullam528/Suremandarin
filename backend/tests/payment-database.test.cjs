const assert = require('node:assert/strict');
const { test } = require('node:test');
const { databaseHarness } = require('./helpers/payment-database-harness.cjs');
const { context, activation, pendingOrder, pendingSubscription, UID } = require('./helpers/payment-harness.cjs');
const engine = process.env.PAYMENT_TEST_DATABASE_URL ? 'PostgreSQL' : 'SQLite';

async function invoke(action, ctx) {
  try { await action(ctx); }
  catch (error) { ctx.status = error.status ?? 500; ctx.error = error; }
  return ctx;
}

test(`real Strapi ${engine} transaction rolls back payment, ledger and lessons after fulfillment failure, then retry commits once`, async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  await h.db.query(UID.order).create({ data: pendingOrder({ productNameSnapshot: 'Mandarin lessons' }) });
  h.failNext(UID.credit, 'beforeCreate');
  const failed = context({ paypalOrderId: 'PAYPAL-ORDER-1' });
  await invoke(h.controller.capturePayPalOrder, failed);
  assert(failed.status >= 500);
  assert.equal((await h.db.query(UID.order).findOne({ where: { id: 10 } })).paymentStatus, 'unpaid');
  assert.equal(await h.db.query(UID.transaction).count(), 0);
  assert.equal(await h.db.query(UID.credit).count(), 0);
  const recovered = context({ paypalOrderId: 'PAYPAL-ORDER-1' });
  await h.controller.capturePayPalOrder(recovered);
  assert.equal(recovered.status, 200);
  assert.equal(Number((await h.db.query(UID.order).findOne({ where: { id: 10 } })).paidAmount), 39.95);
  assert.equal(await h.db.query(UID.transaction).count(), 1);
  assert.equal(await h.db.query(UID.credit).count(), 1);
});

test(`two independent ${engine} connections settle concurrent duplicate captures without duplicate ledger or lessons`, async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  await h.db.query(UID.order).create({ data: pendingOrder({ productNameSnapshot: 'Mandarin lessons' }) });
  const worker = await h.connect();
  const contexts = [context({ paypalOrderId: 'PAYPAL-ORDER-1' }), context({ paypalOrderId: 'PAYPAL-ORDER-1' })];
  await Promise.all([invoke(h.controller.capturePayPalOrder, contexts[0]), invoke(worker.controller.capturePayPalOrder, contexts[1])]);
  for (let i = 0; i < contexts.length; i++) {
    // SQLite may report SQLITE_BUSY when two deferred readers upgrade to writers;
    // the endpoint returns retryable 5xx, and a normal retry must recover.
    if (contexts[i].status >= 500) await invoke([h, worker][i].controller.capturePayPalOrder, contexts[i] = context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
    assert.equal(contexts[i].status, 200);
  }
  assert.equal(await h.db.query(UID.transaction).count(), 1);
  assert.equal(await h.db.query(UID.credit).count(), 1);
  assert.equal(Number((await h.db.query(UID.order).findOne({ where: { id: 10 } })).paidAmount), 39.95);
});

test(`real Strapi ${engine} webhook rollback leaves a retryable event and no partial membership, then activation and cancellation work`, async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  await h.strapi.documents(UID.subscription).create({ data: pendingSubscription() });
  h.failNext(UID.entitlement, 'beforeCreate');
  const failed = context(activation(), null); await h.controller.paypalWebhook(failed);
  assert.equal(failed.status, 503);
  assert.equal((await h.db.query(UID.subscription).findOne({ where: { id: 11 } })).status, 'suspended');
  assert.equal((await h.db.query(UID.user).findOne({ where: { id: 7 } })).membershipStatus, 'inactive');
  assert.equal(await h.db.query(UID.entitlement).count(), 0);
  assert.equal((await h.db.query(UID.event).findOne({ where: { externalEventId: activation().id } })).processed, false);
  const recovered = context(activation(), null); await h.controller.paypalWebhook(recovered);
  assert.equal(recovered.status, 200);
  assert.equal(await h.db.query(UID.entitlement).count({ where: { status: 'active' } }), 3);
  assert.equal((await h.db.query(UID.event).findOne({ where: { externalEventId: activation().id } })).processingAttempts, 2);
  const snapshot = { ...activation().resource, status: 'CANCELLED', status_update_time: '2026-10-23T01:00:00Z' };
  h.paypal.getSubscription = async () => snapshot;
  const cancelled = context(activation({ id: 'WH-CANCELLED', event_type: 'BILLING.SUBSCRIPTION.CANCELLED', resource: snapshot }), null);
  await h.controller.paypalWebhook(cancelled);
  assert.equal(cancelled.status, 200);
  assert.equal(await h.db.query(UID.entitlement).count({ where: { status: 'active' } }), 0);
  assert.equal((await h.db.query(UID.user).findOne({ where: { id: 7 } })).membershipStatus, 'cancelled');
});

test('database unique keys reject duplicate provider events and capture facts', async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  const event = { provider: 'paypal', externalEventId: 'WH-UNIQUE', eventType: 'BILLING.SUBSCRIPTION.ACTIVATED' };
  await h.strapi.documents(UID.event).create({ data: event });
  await assert.rejects(() => h.strapi.documents(UID.event).create({ data: event }), /unique/i);
  const transaction = { transactionNumber: 'PP-UNIQUE', idempotencyKey: 'paypal:capture:UNIQUE', channel: 'paypal', action: 'capture' };
  await h.strapi.documents(UID.transaction).create({ data: transaction });
  await assert.rejects(() => h.strapi.documents(UID.transaction).create({ data: { ...transaction, transactionNumber: 'PP-SECOND' } }), /unique/i);
  const credit = { sourceKey: 'purchase-order-v1:unique', user: 7, hours: 4, source: 'purchase', status: 'available', grantedAt: new Date() };
  await h.strapi.documents(UID.credit).create({ data: credit });
  await assert.rejects(() => h.strapi.documents(UID.credit).create({ data: credit }), /unique/i);
});

test(`independent ${engine} webhook workers deduplicate the same event and do not duplicate membership rights`, async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  await h.strapi.documents(UID.subscription).create({ data: pendingSubscription() });
  const worker = await h.connect();
  const contexts = [context(activation(), null), context(activation(), null)];
  await Promise.all([h.controller.paypalWebhook(contexts[0]), worker.controller.paypalWebhook(contexts[1])]);
  for (let i = 0; i < contexts.length; i++) {
    if (contexts[i].status >= 500) await [h, worker][i].controller.paypalWebhook(contexts[i] = context(activation(), null));
    assert.equal(contexts[i].status, 200);
  }
  assert.equal(await h.db.query(UID.event).count(), 1);
  assert.equal((await h.db.query(UID.event).findOne({ where: { externalEventId: activation().id } })).processed, true);
  assert.equal(await h.db.query(UID.entitlement).count({ where: { status: 'active' } }), 3);
});

test('nested capture settlement participates in the real webhook transaction and is retryable after failure', async (t) => {
  const h = await databaseHarness(); t.after(() => h.close());
  await h.db.query(UID.order).create({ data: pendingOrder({ productNameSnapshot: 'Mandarin lessons' }) });
  const event = { id: 'WH-CAPTURE-1', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {
    id: 'CAPTURE-1', supplementary_data: { related_ids: { order_id: 'PAYPAL-ORDER-1' } },
  } };
  h.failNext(UID.credit, 'beforeCreate');
  const failed = context(event, null); await h.controller.paypalWebhook(failed);
  assert.equal(failed.status, 503);
  assert.equal(await h.db.query(UID.transaction).count(), 0);
  assert.equal((await h.db.query(UID.order).findOne({ where: { id: 10 } })).paymentStatus, 'unpaid');
  assert.equal((await h.db.query(UID.event).findOne({ where: { externalEventId: event.id } })).processed, false);
  const retry = context(event, null); await h.controller.paypalWebhook(retry);
  assert.equal(retry.status, 200);
  assert.equal(await h.db.query(UID.transaction).count(), 1);
  assert.equal(await h.db.query(UID.credit).count(), 1);
  assert.equal((await h.db.query(UID.event).findOne({ where: { externalEventId: event.id } })).processed, true);
});
