const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { capture, harness, context, pendingOrder, UID } = require('./helpers/payment-harness.cjs');

const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/api/payment/services/paypal.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

// The VM has no real fetch or production environment. Even accidental unmocked
// requests fail locally; no PayPal account or transaction is used by this suite.
function transport(handler, env = {}) {
  const calls = [];
  const timeouts = [];
  const mod = { exports: {} };
  const sandbox = {
    module: mod, exports: mod.exports, Buffer,
    process: { env: { PAYPAL_ENV: 'sandbox', PAYPAL_CLIENT_ID: 'synthetic-client', PAYPAL_CLIENT_SECRET: 'synthetic-secret', PAYPAL_WEBHOOK_ID: 'synthetic-webhook', ...env } },
    AbortSignal: { timeout(ms) { timeouts.push(ms); return new AbortController().signal; } },
    async fetch(url, init = {}) {
      assert.equal(new URL(url).origin, 'https://api-m.sandbox.paypal.com', 'Only the synthetic sandbox host may be requested');
      const call = { url, path: new URL(url).pathname, ...init };
      calls.push(call);
      if (call.path === '/v1/oauth2/token') return reply(200, { access_token: 'synthetic-token', expires_in: 3600 });
      return handler(call);
    },
  };
  vm.runInNewContext(source, sandbox, { filename: 'paypal.ts' });
  return { paypal: mod.exports.default(), calls, timeouts };
}

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, async json() { return structuredClone(body); } });
const apiCalls = (t) => t.calls.filter((call) => call.path !== '/v1/oauth2/token');

test('a lost capture response is reconciled with GET without a second capture request', async () => {
  const lostResponse = new Error('Synthetic response timeout after provider capture');
  const t = transport((call) => {
    if (call.method === 'POST') throw lostResponse;
    assert.equal(call.path, '/v2/checkout/orders/PAYPAL-ORDER-1');
    return reply(200, capture());
  });
  const result = await t.paypal.captureOrder('PAYPAL-ORDER-1', 'SM-TEST-1-capture');
  assert.equal(result.purchase_units[0].payments.captures[0].amount.value, '39.95');
  assert.deepEqual(apiCalls(t).map((call) => call.method ?? 'GET'), ['POST', 'GET']);
  assert(t.timeouts.length >= 4);
  assert(t.timeouts.every((ms) => ms > 0 && ms <= 15_000));
});

test('ORDER_ALREADY_CAPTURED returns the authoritative completed order for local retry recovery', async () => {
  const t = transport((call) => call.method === 'POST'
    ? reply(422, { name: 'UNPROCESSABLE_ENTITY', details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] })
    : reply(200, capture()));
  assert.equal((await t.paypal.captureOrder('PAYPAL-ORDER-1', 'SM-TEST-1-capture')).status, 'COMPLETED');
  assert.equal(apiCalls(t).filter((call) => call.method === 'POST').length, 1);
});

test('a minimal successful capture response is expanded before local settlement', async () => {
  const t = transport((call) => call.method === 'POST'
    ? reply(201, { id: 'PAYPAL-ORDER-1', status: 'COMPLETED', links: [] })
    : reply(200, capture()));
  const result = await t.paypal.captureOrder('PAYPAL-ORDER-1', 'SM-TEST-1-capture');
  assert.equal(result.purchase_units[0].reference_id, 'SM-TEST-1');
  assert.equal(apiCalls(t)[0].headers.Prefer, 'return=representation');
  assert.deepEqual(apiCalls(t).map((call) => call.method ?? 'GET'), ['POST', 'GET']);
});

test('a capture retried after a local failure uses the same idempotency key and cannot double-fulfill', async () => {
  const t = transport(() => reply(201, capture()));
  const h = harness({ orders: [pendingOrder()], paypal: { captureOrder: t.paypal.captureOrder } });
  h.failNext(UID.credit, 'create');
  await assert.rejects(() => h.controller.capturePayPalOrder(context({ paypalOrderId: 'PAYPAL-ORDER-1' })));
  assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid');
  await h.controller.capturePayPalOrder(context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  assert.deepEqual(apiCalls(t).map((call) => call.headers['PayPal-Request-Id']), ['SM-TEST-1-capture', 'SM-TEST-1-capture']);
  assert.equal(h.rows(UID.transaction).length, 1);
  assert.equal(h.rows(UID.credit).length, 1);
});

test('failed reconciliation preserves the capture error and never records money or grants lessons', async () => {
  const lostResponse = new Error('Synthetic capture timeout');
  for (const recovery of ['unpaid', 'unavailable']) {
    const t = transport((call) => {
      if (call.method === 'POST') throw lostResponse;
      if (recovery === 'unavailable') return reply(503, { name: 'SERVICE_UNAVAILABLE' });
      return reply(200, { id: 'PAYPAL-ORDER-1', status: 'APPROVED', purchase_units: [] });
    });
    const h = harness({ orders: [pendingOrder()], paypal: { captureOrder: t.paypal.captureOrder } });
    await assert.rejects(() => h.controller.capturePayPalOrder(context({ paypalOrderId: 'PAYPAL-ORDER-1' })), (error) => error === lostResponse);
    assert.equal(h.rows(UID.order)[0].paymentStatus, 'unpaid');
    assert.equal(h.rows(UID.order)[0].paidAmount, 0);
    assert.equal(h.rows(UID.transaction).length, 0);
    assert.equal(h.rows(UID.credit).length, 0);
    assert.equal(apiCalls(t).length, 2);
  }
});

test('provider errors retain issue/debug identifiers without leaking the full payer response', async () => {
  const t = transport((call) => call.method === 'POST'
    ? reply(422, { name: 'UNPROCESSABLE_ENTITY', debug_id: 'synthetic-debug', details: [{ issue: 'INSTRUMENT_DECLINED' }], payer: { email_address: 'private-payer@example.test' } })
    : reply(200, { id: 'PAYPAL-ORDER-1', status: 'APPROVED' }));
  await assert.rejects(() => t.paypal.captureOrder('PAYPAL-ORDER-1', 'SM-TEST-1-capture'), (error) => {
    assert.equal(error.status, 422);
    assert.match(error.message, /INSTRUMENT_DECLINED/);
    assert.match(error.message, /synthetic-debug/);
    assert.doesNotMatch(error.message, /private-payer|email_address/);
    return true;
  });
});

test('webhook verification sends the signed envelope to PayPal and trusts only SUCCESS', async () => {
  const event = { id: 'EVENT-VERIFY', event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', resource: { id: 'I-SUB-1' } };
  const headers = {
    'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/synthetic-cert',
    'paypal-transmission-id': 'TRANSMISSION-1', 'paypal-transmission-sig': 'synthetic-signature',
    'paypal-transmission-time': '2026-10-23T00:00:00Z',
  };
  for (const verification_status of ['SUCCESS', 'FAILURE', 'UNKNOWN']) {
    const t = transport((call) => {
      assert.equal(call.path, '/v1/notifications/verify-webhook-signature');
      assert.equal(call.method, 'POST');
      assert.deepEqual(JSON.parse(call.body), {
        auth_algo: headers['paypal-auth-algo'], cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'], transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'], webhook_id: 'synthetic-webhook', webhook_event: event,
      });
      return reply(200, { verification_status });
    });
    assert.equal(await t.paypal.verifyWebhook(headers, event), verification_status === 'SUCCESS');
    assert.equal(apiCalls(t).length, 1, 'The cert URL must not be fetched by the application');
  }
});

test('missing webhook configuration fails closed before any external call', async () => {
  const t = transport(() => { throw new Error('Unexpected external call'); }, { PAYPAL_WEBHOOK_ID: undefined });
  await assert.rejects(() => t.paypal.verifyWebhook({}, {}), /PAYPAL_WEBHOOK_ID is not configured/);
  assert.equal(t.calls.length, 0);
});

test('provider resource identifiers are safely encoded in read-only paths', async () => {
  const t = transport((call) => reply(200, { id: call.path }));
  await t.paypal.getOrder('order/with?query');
  await t.paypal.getSubscription('subscription/with?query');
  assert.deepEqual(apiCalls(t).map((call) => call.path), [
    '/v2/checkout/orders/order%2Fwith%3Fquery', '/v1/billing/subscriptions/subscription%2Fwith%3Fquery',
  ]);
});

test('legacy membership, terminal orders, and invalid price snapshots are rejected before collecting funds', async () => {
  const invalidOrders = [
    pendingOrder({ productType: 'membership' }),
    pendingOrder({ orderStatus: 'cancelled' }),
    pendingOrder({ orderStatus: 'refunded', paymentStatus: 'refunded' }),
    pendingOrder({ paymentStatus: 'partially-refunded' }),
    pendingOrder({ unitPrice: 0, originalAmount: 0 }),
    pendingOrder({ unitPrice: '39.951', originalAmount: '39.951' }),
    pendingOrder({ originalAmount: '40.00' }),
    pendingOrder({ currency: 'UNSUPPORTED' }),
  ];
  for (const order of invalidOrders) {
    const t = transport(() => { throw new Error('Preflight must not contact PayPal'); });
    const h = harness({ orders: [order], paypal: { captureOrder: t.paypal.captureOrder, getOrder: t.paypal.getOrder } });
    const ctx = context({ paypalOrderId: 'PAYPAL-ORDER-1' });
    await h.controller.capturePayPalOrder(ctx);
    assert.equal(ctx.status, 400);
    assert.equal(t.calls.length, 0);
    assert.equal(h.rows(UID.transaction).length, 0);
    assert.equal(h.rows(UID.credit).length, 0);
  }
});

test('membership purchases must use subscriptions rather than creating unsupported one-time orders', async () => {
  const h = harness();
  const ctx = context({ productType: 'membership', planDocumentId: 'plan-vip' });
  await h.controller.createPayPalOrder(ctx);
  assert.equal(ctx.status, 400);
  assert.equal(h.providerCalls.length, 0);
  assert.equal(h.rows(UID.order).length, 0);
});

test('an already-paid local order is reconciled using read-only GET and never another capture POST', async () => {
  const t = transport((call) => {
    assert.notEqual(call.method, 'POST', 'A paid order cannot start another capture');
    return reply(200, capture());
  });
  const h = harness({
    orders: [pendingOrder({ orderStatus: 'paid', paymentStatus: 'paid', paidAmount: 0, paidAt: '2026-10-23T00:00:00Z' })],
    paypal: { captureOrder: t.paypal.captureOrder, getOrder: t.paypal.getOrder },
  });
  await h.controller.capturePayPalOrder(context({ paypalOrderId: 'PAYPAL-ORDER-1' }));
  assert.deepEqual(apiCalls(t).map((call) => call.method ?? 'GET'), ['GET']);
  assert.equal(Number(h.rows(UID.order)[0].paidAmount), 39.95);
  assert.equal(h.rows(UID.transaction).length, 1);
});
