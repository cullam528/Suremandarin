const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { AsyncLocalStorage } = require('node:async_hooks');

const root = path.join(__dirname, '../..');
const UID = {
  order: 'api::order.order', subscription: 'api::membership-subscription.membership-subscription',
  event: 'api::webhook-event.webhook-event', user: 'plugin::users-permissions.user',
  plan: 'api::membership-plan.membership-plan', course: 'api::course.course',
  credit: 'api::lesson-credit.lesson-credit', entitlement: 'api::entitlement.entitlement',
  transaction: 'api::payment-transaction.payment-transaction',
};
const clone = (value) => structuredClone(value);
const fixtureNow = Date.parse('2026-10-23T12:00:00Z');
class FixtureDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixtureNow])); }
  static now() { return fixtureNow; }
}

function matches(row, filter = {}) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$and') return value.every((item) => matches(row, item));
    if (key === '$or') return value.some((item) => matches(row, item));
    const actual = row[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) return value.$in.includes(actual);
      if ('$ne' in value) return actual !== value.$ne;
      if ('$null' in value) return value.$null ? actual == null : actual != null;
      return matches(actual && typeof actual === 'object' ? actual : { id: actual, documentId: actual }, value);
    }
    if (actual && typeof actual === 'object') return actual.id === value || actual.documentId === value;
    return value == null ? actual == null : actual === value;
  });
}

// Executes the checked-out TypeScript implementation, never a rewritten payment algorithm.
// Network I/O is unavailable in the VM; every provider result is an explicit synthetic fixture.
function loadTypeScript(relativePath, strapi, overrides = {}, cache = new Map()) {
  const file = path.resolve(root, relativePath);
  if (cache.has(file)) return cache.get(file).exports;
  const mod = { exports: {} };
  cache.set(file, mod);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const sandbox = {
    module: mod, exports: mod.exports, strapi, Buffer, URL, Date: FixtureDate, setTimeout, clearTimeout,
    process: { env: { NODE_ENV: 'test', PAYPAL_ENV: 'sandbox' } },
    require(name) {
      if (name in overrides) return overrides[name];
      if (name.startsWith('.')) {
        let next = path.resolve(path.dirname(file), name);
        if (!path.extname(next)) next += '.ts';
        return loadTypeScript(next, strapi, overrides, cache);
      }
      if (name.startsWith('node:')) return require(name);
      throw new Error(`Unexpected dependency in payment harness: ${name}`);
    },
    fetch() { throw new Error('Payment tests may not access the network'); },
  };
  vm.runInNewContext(source, sandbox, { filename: file });
  return mod.exports;
}

function context(body = {}, user = { id: 7 }) {
  const ctx = { state: { user }, request: { body }, headers: {}, status: 200 };
  for (const [method, status] of Object.entries({ unauthorized: 401, forbidden: 403, notFound: 404, badRequest: 400, conflict: 409, internalServerError: 500, serviceUnavailable: 503 })) {
    ctx[method] = (message) => { ctx.status = status; ctx.body = { error: message }; return ctx.body; };
  }
  ctx.throw = (status, message) => { const error = new Error(message); error.status = status; throw error; };
  return ctx;
}

function capture(overrides = {}) {
  return {
    id: 'PAYPAL-ORDER-1', status: 'COMPLETED',
    purchase_units: [{ reference_id: 'SM-TEST-1', custom_id: 'SM-TEST-1', payments: { captures: [{
      id: 'CAPTURE-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '39.95' },
      create_time: '2026-10-23T00:00:00Z', final_capture: true,
    }] } }], ...overrides,
  };
}

function activation(overrides = {}) {
  return {
    id: 'WH-ACTIVATED-1', event_type: 'BILLING.SUBSCRIPTION.ACTIVATED', create_time: '2026-10-23T00:00:00Z',
    resource: { id: 'I-SUBSCRIPTION-1', custom_id: 'subscription-1', plan_id: 'P-VIP-MONTHLY', status: 'ACTIVE',
      status_update_time: '2026-10-23T00:00:00Z', start_time: '2026-10-23T00:00:00Z',
      billing_info: { next_billing_time: '2099-11-23T00:00:00Z' } },
    ...overrides,
  };
}

function harness({ orders = [], subscriptions = [], entitlements = [], user: userOverrides = {}, paypal: paypalOverrides = {} } = {}) {
  const tables = new Map();
  const writes = [];
  const providerCalls = [];
  const failures = [];
  let nextId = 100;
  const user = { id: 7, documentId: 'user-7', membershipLevel: 'registered', membershipStatus: 'inactive', ...userOverrides };
  const plan = { id: 8, documentId: 'plan-vip', name: 'VIP', code: 'vip', enabled: true,
    monthlyPrice: 39.95, yearlyPrice: 399, currency: 'USD', paypalMonthlyPlanId: 'P-VIP-MONTHLY' };
  const course = { id: 9, documentId: 'course-1', title: 'Mandarin lessons', enabled: true,
    allowStandalonePurchase: true, standalonePrice: 39.95, currency: 'USD', lessonHours: 4 };
  for (const [uid, rows] of [[UID.user, [user]], [UID.plan, [plan]], [UID.course, [course]], [UID.order, orders], [UID.subscription, subscriptions], [UID.entitlement, entitlements]]) {
    tables.set(uid, clone(rows));
  }
  const rows = (uid) => { if (!tables.has(uid)) tables.set(uid, []); return tables.get(uid); };
  const populate = (row) => {
    const result = clone(row);
    for (const [key, uid] of [['user', UID.user], ['plan', UID.plan], ['course', UID.course], ['membershipPlan', UID.plan], ['order', UID.order], ['subscription', UID.subscription]]) {
      if (result[key] != null && typeof result[key] !== 'object') {
        result[key] = clone(rows(uid).find((item) => item.id === result[key] || item.documentId === result[key]) ?? result[key]);
      }
    }
    return result;
  };
  function failIfRequested(uid, operation) {
    const index = failures.findIndex((failure) => failure.uid === uid && failure.operation === operation);
    if (index >= 0) throw failures.splice(index, 1)[0].error;
  }
  function repository(uid, documentApi = false) {
    return {
      async findMany(options = {}) {
        failIfRequested(uid, 'findMany');
        return rows(uid).filter((row) => matches(populate(row), options.filters ?? options.where)).slice(0, options.limit ?? Infinity)
          .map((row) => options.populate ? populate(row) : clone(row));
      },
      async findOne(options = {}) {
        failIfRequested(uid, 'findOne');
        const row = rows(uid).find((row) => matches(populate(row), options.where ?? (options.documentId ? { documentId: options.documentId } : options.filters)));
        return row ? options.populate ? populate(row) : clone(row) : null;
      },
      async create({ data }) {
        failIfRequested(uid, 'create');
        for (const field of [uid === UID.event ? 'externalEventId' : null, uid === UID.credit ? 'sourceKey' : null, uid === UID.transaction ? 'idempotencyKey' : null].filter(Boolean)) {
          if (rows(uid).some((row) => row[field] === data[field])) throw new Error(`UNIQUE constraint failed: ${field}`);
        }
        const row = { id: nextId++, documentId: `document-${nextId}`, ...clone(data) };
        rows(uid).push(row); writes.push({ uid, operation: 'create', data: clone(data) }); return clone(row);
      },
      async update(options) {
        failIfRequested(uid, 'update');
        const row = rows(uid).find((row) => matches(row, options.where ?? { documentId: options.documentId }));
        assert(row, `Missing ${uid} record for update`);
        Object.assign(row, clone(options.data)); writes.push({ uid, operation: 'update', data: clone(options.data) });
        return options.populate ? populate(row) : clone(row);
      },
      async updateMany({ where, filters, data }) {
        failIfRequested(uid, 'updateMany'); let count = 0;
        for (const row of rows(uid).filter((item) => matches(item, where ?? filters))) { Object.assign(row, clone(data)); count++; }
        writes.push({ uid, operation: 'updateMany', data: clone(data) }); return { count };
      },
    };
  }
  const paypal = {
    async createOrder(input) { providerCalls.push({ method: 'createOrder', input }); return { id: 'PAYPAL-ORDER-1', status: 'CREATED', links: [] }; },
    async captureOrder(id, requestId) {
      providerCalls.push({ method: 'captureOrder', id, requestId });
      const order = rows(UID.order).find((row) => row.externalOrderId === id);
      const result = capture(); result.purchase_units[0].custom_id = order?.orderNumber ?? 'SM-TEST-1';
      result.purchase_units[0].reference_id = order?.orderNumber ?? 'SM-TEST-1'; return result;
    },
    async getOrder(id) { providerCalls.push({ method: 'getOrder', id }); return this.captureOrder(id); },
    async getSubscription(id) { providerCalls.push({ method: 'getSubscription', id }); return activation().resource; },
    async verifyWebhook() { return true; }, ...paypalOverrides,
  };
  let pendingTransaction = Promise.resolve();
  const transactionContext = new AsyncLocalStorage();
  const trx = () => ({ where() { return this; }, async update() { return 1; }, async forUpdate() { return []; }, async first() { return null; } });
  trx.raw = async () => [];
  trx.ref = (column) => ({ column });
  async function transaction(callback) {
    const nested = transactionContext.getStore();
    const previous = pendingTransaction;
    let unlock;
    if (!nested) { pendingTransaction = new Promise((resolve) => { unlock = resolve; }); await previous; }
    const before = clone([...tables.entries()]);
    try { return await transactionContext.run(true, () => callback({ trx, onCommit() {} })); }
    catch (error) { tables.clear(); for (const [uid, data] of before) tables.set(uid, data); throw error; }
    finally { if (unlock) unlock(); }
  }
  const strapi = {
    documents: (uid) => repository(uid, true),
    db: { query: (uid) => repository(uid), transaction,
      metadata: { get(uid) { return { tableName: uid, attributes: new Proxy({}, { get: (_, column) => ({ columnName: String(column).replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`) }) }) }; } },
    },
    service(name) { assert.equal(name, 'api::payment.paypal'); return paypal; },
    log: { warn() {}, error() {}, info() {} },
  };
  const referralCalls = [];
  const controller = loadTypeScript('src/api/payment/controllers/payment.ts', strapi, {
    '../../referral/services/referral-rewards': {
      async evaluateReferralRewards() {},
      async markReferralPayment(...args) { referralCalls.push(args[1]); },
    },
  }).default;
  return { controller, strapi, paypal, writes, providerCalls, referralCalls,
    rows: (uid) => clone(rows(uid)),
    failNext(uid, operation, error = new Error('Synthetic transient database failure')) { failures.push({ uid, operation, error }); },
  };
}

const pendingOrder = (overrides = {}) => ({ id: 10, documentId: 'order-1', orderNumber: 'SM-TEST-1',
  user: 7, externalOrderId: 'PAYPAL-ORDER-1', productType: 'course', unitPrice: 39.95,
  originalAmount: 39.95, discountAmount: 0, paidAmount: 0, quantity: 1, currency: 'USD',
  orderStatus: 'awaiting-payment', paymentStatus: 'unpaid', channel: 'paypal', lessonHours: 4, ...overrides });
const pendingSubscription = (overrides = {}) => ({ id: 11, documentId: 'subscription-1', subscriptionNumber: 'SUB-TEST-1',
  externalSubscriptionId: 'I-SUBSCRIPTION-1', user: 7, plan: 'plan-vip', channel: 'paypal', status: 'suspended', autoRenew: true,
  externalPlanId: 'P-VIP-MONTHLY', billingAmount: 39.95, billingCurrency: 'USD', ...overrides });

module.exports = { harness, context, capture, activation, pendingOrder, pendingSubscription, UID, loadTypeScript };
