const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const { Database } = require('@strapi/database');

const root = path.resolve(__dirname, '../..');
const USER = 'plugin::users-permissions.user';
const ROLE = 'plugin::users-permissions.role';
const REFERRAL = 'api::referral.referral';
const CREDIT = 'api::lesson-credit.lesson-credit';

// Only requested TypeScript modules are compiled. No application bootstrap,
// dotenv loader, deployment config, existing database or external service runs.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};
const load = (filename) => require(path.join(root, filename));

function schemas() {
  const result = new Map();
  result.set(USER, load('src/extensions/users-permissions/content-types/user/schema.json'));
  for (const name of ['referral', 'lesson-credit', 'order', 'course', 'membership-plan']) {
    result.set(`api::${name}.${name}`, load(`src/api/${name}/content-types/${name}/schema.json`));
  }
  result.set(ROLE, {
    collectionName: 'up_roles', info: { singularName: 'role' },
    attributes: {
      name: { type: 'string' }, type: { type: 'string', unique: true },
      users: { type: 'relation', relation: 'oneToMany', target: USER, mappedBy: 'role' },
    },
  });
  return result;
}

function databaseModels(source) {
  return [...source].map(([uid, schema]) => ({
    uid, tableName: schema.collectionName, singularName: schema.info.singularName,
    attributes: {
      id: { type: 'increments' }, documentId: { type: 'string' },
      createdAt: { type: 'datetime' }, updatedAt: { type: 'datetime' },
      ...Object.fromEntries(Object.entries(schema.attributes).filter(([, attribute]) => {
        // Media/components and unrelated content models are outside this test's
        // boundary. Every user/referral/credit/order field and relation remains.
        if (['media', 'component', 'dynamiczone'].includes(attribute.type)) return false;
        return attribute.type !== 'relation' || source.has(attribute.target);
      })),
    },
  }));
}

async function createHarness() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'suremandarin-referrals-'));
  const source = schemas();
  const postgresUrl = process.env.REFERRAL_TEST_POSTGRES_URL;
  let schema;
  if (postgresUrl) {
    const url = new URL(postgresUrl);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)
      || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      || url.pathname !== '/suremandarin_referral_test' || url.search || url.hash) {
      fs.rmSync(directory, { recursive: true, force: true });
      throw new Error('REFERRAL_TEST_POSTGRES_URL must point to a local suremandarin_referral_test database, without URL options.');
    }
    schema = `referral_test_${randomUUID().replaceAll('-', '')}`;
  }
  const db = new Database({
    connection: postgresUrl ? {
      client: 'postgres', connection: { connectionString: postgresUrl, schema },
      pool: { min: 0, max: 10 },
    } : {
      client: 'sqlite', connection: { filename: path.join(directory, 'test.sqlite') },
      useNullAsDefault: true,
    },
    settings: { migrations: { dir: directory }, runMigrations: false },
    logger: { info() {}, debug() {}, warn() {}, error() {} },
  });
  const services = {};
  const profiles = new Map();
  const providerCalls = [];
  const advanced = { allow_register: true, unique_email: true, default_role: 'authenticated', email_confirmation: false };
  const grant = Object.fromEntries(['email', 'google', 'linkedin', 'twitter'].map((name) => [name, { enabled: true }]));
  const env = (_key, fallback) => fallback;
  env.bool = env;
  env.int = env;
  const pluginConfig = load('config/plugins.ts').default({ env })['users-permissions'].config;
  const strapi = {
    db, log: db.logger,
    getModel: (uid) => source.get(uid),
    config: {
      get(key, fallback) {
        if (key === 'plugin::users-permissions') return pluginConfig;
        if (key.startsWith('plugin::users-permissions.')) {
          return key.slice('plugin::users-permissions.'.length).split('.').reduce((value, part) => value?.[part], pluginConfig) ?? fallback;
        }
        return fallback;
      },
    },
    store(options = {}) {
      return { async get({ key = options.key } = {}) {
        if (key === 'advanced') return advanced;
        if (key === 'grant') return grant;
        throw new Error(`Unexpected plugin store key: ${key}`);
      } };
    },
    plugin(name) {
      if (name !== 'users-permissions') throw new Error(`External plugin unavailable: ${name}`);
      return { service: (key) => services[key] };
    },
    documents(uid) {
      return {
        async create({ data, ...options }) {
          // Real user service + real database/lifecycles. The full Document
          // Service is outside this focused test; preserve its password hashing.
          const values = { ...data };
          if (uid === USER) await services.user.ensureHashedPasswords(values);
          return db.query(uid).create({ data: values, ...options });
        },
        async update({ documentId, data, ...options }) {
          return db.query(uid).update({ where: { documentId }, data, ...options });
        },
      };
    },
    contentAPI: { sanitize: { async output(user) {
      return Object.fromEntries(Object.entries(user).filter(([key]) => !source.get(USER).attributes[key]?.private));
    } } },
    sessionManager() {
      return {
        async generateRefreshToken(id) { return { token: `synthetic-refresh-${id}` }; },
        async generateAccessToken(token) { return { token: `synthetic-access-${token}` }; },
      };
    },
  };
  const previousStrapi = global.strapi;
  global.strapi = strapi;
  try {
    if (schema) await db.connection.raw('CREATE SCHEMA ??', [schema]);
    await db.init({ models: databaseModels(source) });
    await db.schema.create();
    db.lifecycles.subscribe({
      beforeCreate(event) {
        // Strapi adds document identifiers before persisting real documents.
        // Relation updates rely on them even for non-localized content types.
        event.params.data.documentId ??= randomUUID();
      },
    });
    const moduleRoot = path.join(root, 'node_modules/@strapi/plugin-users-permissions/dist/server');
    const pluginRequire = createRequire(path.join(moduleRoot, 'index.js'));
    const plugin = {
      controllers: {
        auth: pluginRequire('./controllers/auth.js').__require(),
        user: { ...pluginRequire('./controllers/user.js').__require() },
      },
      services: {
        user: pluginRequire('./services/user.js').__require(),
        providers: pluginRequire('./services/providers.js').__require(),
        'providers-registry': () => ({
          async run({ provider, accessToken }) {
            providerCalls.push({ provider, inTransaction: db.inTransaction() });
            const profile = profiles.get(`${provider}:${accessToken}`);
            if (!profile) throw new Error('Synthetic provider rejected credentials');
            return { ...profile };
          },
        }),
      },
    };
    const extend = load('src/extensions/users-permissions/strapi-server.ts').default;
    extend(plugin);
    for (const [name, factory] of Object.entries(plugin.services)) {
      services[name] = typeof factory === 'function' ? factory({ strapi }) : factory;
    }
    services.jwt = { issue: ({ id }) => `synthetic-jwt-${id}` };
    const auth = typeof plugin.controllers.auth === 'function' ? plugin.controllers.auth({ strapi }) : plugin.controllers.auth;
    const registration = load('src/utils/referral-registration.ts');
    db.lifecycles.subscribe({
      models: [USER],
      beforeCreate: (event) => registration.prepareReferralRegistration(strapi, event.params.data),
      afterCreate: (event) => registration.createReferralRecord(strapi, event.result, event.params.data),
    });
    db.lifecycles.subscribe({
      models: [CREDIT],
      ...load('src/api/lesson-credit/content-types/lesson-credit/lifecycles.ts').default,
    });
    await db.query(ROLE).create({ data: { name: 'Authenticated', type: 'authenticated' } });

    function context({ body = {}, query = {}, provider } = {}) {
      const cookieWrites = [];
      return {
        request: { body, headers: {}, header: {} }, query, params: { provider },
        state: {}, cookies: { set: (...args) => cookieWrites.push(args) }, cookieWrites,
        send(value) { this.body = value; return value; },
        badRequest(message) { this.status = 400; this.body = { error: { message } }; },
      };
    }
    return {
      strapi, db, services, auth, userController: plugin.controllers.user,
      registration, advanced, profiles, providerCalls, directory, context,
      async register(body) {
        const ctx = context({ body });
        await auth.register(ctx);
        return ctx.body;
      },
      async social(provider, email, query = {}, profile = {}) {
        const token = `${email}:${profiles.size}`;
        profiles.set(`${provider}:${token}`, { email, username: email.split('@')[0], ...profile });
        const ctx = context({ provider, query: { access_token: token, ...query } });
        await auth.callback(ctx);
        return ctx.body;
      },
      async close() {
        if (schema) await db.connection.raw('DROP SCHEMA ?? CASCADE', [schema]);
        await db.destroy();
        global.strapi = previousStrapi;
        fs.rmSync(directory, { recursive: true, force: true });
      },
    };
  } catch (error) {
    if (schema) await db.connection.raw('DROP SCHEMA IF EXISTS ?? CASCADE', [schema]);
    await db.destroy();
    global.strapi = previousStrapi;
    fs.rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { createHarness, load, USER, ROLE, REFERRAL, CREDIT };
