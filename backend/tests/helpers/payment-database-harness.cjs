const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Database } = require('@strapi/database');
const { AsyncLocalStorage } = require('node:async_hooks');
const { loadTypeScript, UID, capture, activation } = require('./payment-harness.cjs');

const root = path.join(__dirname, '../..');
const supported = new Set(Object.values(UID));

// Use checked-in model attributes, indexes, relation tables and installed Strapi's
// real query engine. Only the public document facade and PayPal HTTP I/O are adapted.
function models() {
  return [...supported].map((uid) => {
    const name = uid.split('::')[1].split('.')[0];
    const file = uid === UID.user ? 'src/extensions/users-permissions/content-types/user/schema.json'
      : `src/api/${name}/content-types/${name}/schema.json`;
    const schema = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    const attributes = { id: { type: 'increments' }, documentId: { type: 'string', unique: true } };
    for (const [name, attr] of Object.entries(schema.attributes)) {
      if (['component', 'dynamiczone', 'media'].includes(attr.type)) continue;
      if (attr.type === 'relation' && !supported.has(attr.target)) continue;
      attributes[name] = attr;
    }
    return { uid, singularName: schema.info.singularName, tableName: schema.collectionName, attributes, indexes: schema.indexes };
  });
}

async function databaseHarness() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'suremandarin-paypal-test-'));
  const databaseUrl = process.env.PAYMENT_TEST_DATABASE_URL;
  let pgAdmin;
  let pgSchema;
  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) {
      fs.rmSync(directory, { recursive: true, force: true });
      throw new Error('Payment database tests accept only an explicitly configured local PostgreSQL server');
    }
    const { Client } = require('pg');
    pgAdmin = new Client({ connectionString: databaseUrl });
    await pgAdmin.connect();
    pgSchema = path.basename(directory).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    await pgAdmin.query(`CREATE SCHEMA "${pgSchema}"`);
  }
  const connections = [];
  const databaseContext = new AsyncLocalStorage();
  const previousStrapi = global.strapi;
  // The installed Strapi database references the application global while writing
  // relations. Scope it per async worker, so separate connections cannot leak.
  global.strapi = { get db() { return databaseContext.getStore(); } };
  let documentCounter = 0;
  async function connect(createSchema = false) {
    const db = new Database({
      connection: { client: databaseUrl ? 'postgres' : 'sqlite',
        connection: databaseUrl ? { connectionString: databaseUrl, schema: pgSchema }
          : { filename: path.join(directory, 'isolated.sqlite') },
        useNullAsDefault: !databaseUrl, pool: { min: 0, max: 1 }, acquireConnectionTimeout: 5_000 },
      settings: { runMigrations: false, migrations: { dir: path.join(directory, 'unused-migrations') } },
      logger: { info() {}, warn() {}, error() {}, debug() {} },
    });
    await db.init({ models: models() });
    if (createSchema) await db.schema.create();
    connections.push(db);
    const query = db.query.bind(db);
    db.query = (uid) => new Proxy(query(uid), { get(repository, key) {
      const value = repository[key];
      return typeof value === 'function' ? (...args) => databaseContext.run(db, () => value.apply(repository, args)) : value;
    } });
    const transaction = db.transaction.bind(db);
    db.transaction = (...args) => databaseContext.run(db, () => transaction(...args));
    const failures = [];
    db.lifecycles.subscribe(async (event) => {
      const index = failures.findIndex((failure) => failure.uid === event.model.uid && failure.action === event.action);
      if (index >= 0) throw failures.splice(index, 1)[0].error;
    });
    const paypal = {
      async verifyWebhook() { return true; },
      async captureOrder() { return capture(); },
      async getOrder() { return capture(); },
      async getSubscription() { return activation().resource; },
    };
    const strapi = {
      db, log: { warn() {}, error() {}, info() {} }, service() { return paypal; },
      documents(uid) {
        const repository = db.query(uid);
        return {
          findMany({ filters, ...options } = {}) { return repository.findMany({ where: filters, ...options }); },
          findOne({ documentId, ...options }) { return repository.findOne({ where: { documentId }, ...options }); },
          async create({ data }) {
            const converted = { documentId: `test-doc-${++documentCounter}`, ...data };
            for (const [name, attr] of Object.entries(db.metadata.get(uid).attributes)) {
              if (attr.type === 'relation' && typeof converted[name] === 'string') {
                const target = await db.query(attr.target).findOne({ where: { documentId: converted[name] } });
                if (!target) throw new Error(`Test fixture relation missing: ${uid}.${name}`);
                converted[name] = target.id;
              }
            }
            return repository.create({ data: converted });
          },
          update({ documentId, data }) { return repository.update({ where: { documentId }, data }); },
        };
      },
    };
    const controller = loadTypeScript('src/api/payment/controllers/payment.ts', strapi, {
      '../../referral/services/referral-rewards': { async markReferralPayment() {}, async evaluateReferralRewards() {} },
    }).default;
    return { db, strapi, controller, paypal,
      failNext(uid, action) { failures.push({ uid, action, error: new Error('Synthetic database write failure') }); },
    };
  }
  const first = await connect(true);
  await first.db.query(UID.user).create({ data: { id: 7, documentId: 'user-7', username: 'payment-test', email: 'payment@example.invalid',
    membershipLevel: 'registered', membershipStatus: 'inactive' } });
  await first.db.query(UID.plan).create({ data: { id: 8, documentId: 'plan-vip', name: 'VIP', code: 'vip', enabled: true,
    monthlyPrice: 39.95, yearlyPrice: 399, currency: 'USD', paypalMonthlyPlanId: 'P-VIP-MONTHLY' } });
  return { ...first, connect,
    async close() {
      for (const db of connections) await db.destroy();
      if (pgAdmin) { await pgAdmin.query(`DROP SCHEMA "${pgSchema}" CASCADE`); await pgAdmin.end(); }
      global.strapi = previousStrapi;
      fs.rmSync(directory, { recursive: true, force: true });
    },
  };
}

module.exports = { databaseHarness };
