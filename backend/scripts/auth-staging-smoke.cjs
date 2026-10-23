/* Isolated real-Strapi smoke test. Requires npm run build and a working local
 * better-sqlite3 native binding. Never reads repository .env files or sends mail.
 * Run: node scripts/auth-staging-smoke.cjs
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');

async function orchestrate() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'suremandarin-auth-smoke-'));
  try {
    for (const directory of ['src', 'config']) {
      fs.cpSync(path.join(root, 'dist', directory), path.join(temporary, 'dist', directory), { recursive: true });
    }
    fs.copyFileSync(path.join(root, 'package.json'), path.join(temporary, 'package.json'));
    fs.mkdirSync(path.join(temporary, 'public', 'uploads'), { recursive: true });
    fs.mkdirSync(path.join(temporary, '.tmp'), { recursive: true });
    fs.mkdirSync(path.join(temporary, 'xdg'), { recursive: true });
    fs.writeFileSync(path.join(temporary, 'empty.env'), '');
    fs.symlinkSync(path.join(root, 'node_modules'), path.join(temporary, 'node_modules'), 'dir');
    const fresh = () => crypto.randomBytes(32).toString('hex');
    // Deliberately construct an allowlist: never copy process.env or a real .env.
    const env = {
      PATH: path.dirname(process.execPath), NODE_ENV: 'production',
      ENV_PATH: path.join(temporary, 'empty.env'), XDG_CONFIG_HOME: path.join(temporary, 'xdg'),
      HOST: '127.0.0.1', PORT: '0', PUBLIC_URL: 'http://127.0.0.1:1337', PROXY_KOA: 'true',
      DATABASE_CLIENT: 'sqlite', DATABASE_FILENAME: '.tmp/auth-smoke.sqlite',
      APP_KEYS: [fresh(), fresh(), fresh(), fresh()].join(','), API_TOKEN_SALT: fresh(),
      ADMIN_JWT_SECRET: fresh(), TRANSFER_TOKEN_SALT: fresh(), JWT_SECRET: fresh(), ENCRYPTION_KEY: fresh(),
      AUTH_GATEWAY_SECRET: fresh(), CRON_ENABLED: 'false', SEED_INITIAL_DATA: 'false',
      STRAPI_TELEMETRY_DISABLED: 'true', ADMIN_NOTIFICATION_EMAIL: '',
      FRONTEND_URL: 'https://staging.suremandarin.example.invalid',
      CLIENT_ORIGINS: 'https://staging.suremandarin.example.invalid',
      CLIENT_APP_URL: 'https://staging.suremandarin.example.invalid',
      EMAIL_FROM: 'Smoke Test <account@example.invalid>', EMAIL_FROM_ADDRESS: 'account@example.invalid',
      EMAIL_REPLY_TO: 'support@example.invalid',
    };
    const child = spawn(process.execPath, [__filename, '--isolated-child', temporary], {
      cwd: temporary, env, stdio: 'inherit',
    });
    const timeout = setTimeout(() => child.kill('SIGTERM'), 120_000);
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', (status) => resolve(status ?? 1));
    });
    clearTimeout(timeout);
    assert.equal(code, 0, 'Isolated Strapi smoke child must finish successfully');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

async function runIsolated(temporary) {
  // Install a transport boundary before importing Strapi or any provider.
  // HTTP and fetch traffic can only connect to this process's loopback server.
  let allowedPort = -1;
  let blockedNetworkAttempts = 0;
  const net = require('node:net');
  const connect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (...args) {
    const normalized = Array.isArray(args[0]) ? args[0] : args;
    const options = typeof normalized[0] === 'object' ? normalized[0] : { port: normalized[0], host: normalized[1] };
    if (!['127.0.0.1', '::1', 'localhost'].includes(options.host || options.hostname || 'localhost')
      || Number(options.port) !== allowedPort) {
      blockedNetworkAttempts += 1;
      throw new Error('External network disabled by the isolated smoke harness');
    }
    return connect.apply(this, args);
  };
  const nativeFetch = globalThis.fetch;
  globalThis.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || Number(url.port) !== allowedPort) {
      blockedNetworkAttempts += 1;
      return Promise.reject(new Error('External fetch disabled by the isolated smoke harness'));
    }
    return nativeFetch(input, init);
  };

  const { createStrapi } = require('@strapi/strapi');
  const strapi = createStrapi({ appDir: temporary, distDir: path.join(temporary, 'dist') });
  strapi.config.set('server.logger.updates.enabled', false);
  strapi.config.set('server.logger.startup.enabled', false);
  strapi.config.set('admin.serveAdminPanel', false);
  strapi.log.level = 'error';
  let checks = 0;
  const messages = [];
  const check = (label, work) => Promise.resolve().then(work).then(() => {
    checks += 1; console.log(`PASS ${label}`);
  });
  try {
    await strapi.load();
    // Capture only this isolated instance's mail boundary. Templates, tokens,
    // account records, session service and HTTP controllers remain real Strapi.
    strapi.plugin('email').service('email').send = async (mail) => {
      messages.push(structuredClone(mail));
      return { id: `local-mail-sink-${messages.length}` };
    };
    await strapi.listen();
    allowedPort = strapi.server.httpServer.address().port;
    const origin = `http://127.0.0.1:${allowedPort}`;
    strapi.config.set('server.absoluteUrl', origin);
    const gateway = process.env.AUTH_GATEWAY_SECRET;
    const email = 'first-member@example.invalid';
    const password = 'SyntheticInitialPassword-42!';
    const newPassword = 'SyntheticReplacementPassword-73!';
    const userQuery = strapi.db.query('plugin::users-permissions.user');
    async function call(route, { method = 'POST', data, raw, trusted = true, jwt, cookie } = {}) {
      const response = await fetch(`${origin}/api${route}`, {
        method, redirect: 'manual', signal: AbortSignal.timeout(15_000),
        headers: {
          'Content-Type': 'application/json', 'x-forwarded-proto': 'https',
          ...(trusted ? { 'x-auth-gateway-secret': gateway, 'x-auth-client-ip': '203.0.113.30' } : {}),
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}), ...(cookie ? { Cookie: cookie } : {}),
        },
        ...(method === 'POST' ? { body: raw ?? JSON.stringify(data ?? {}) } : {}),
      });
      const text = await response.text();
      let body;
      try { body = JSON.parse(text); } catch { body = null; }
      return { status: response.status, headers: response.headers, body };
    }

    await check('actual middleware rejects native auth before malformed JSON reaches the body parser', async () => {
      assert.equal((await call('/auth/local', { raw: '{', trusted: false })).status, 403);
      assert.equal((await call('/auth/local', { raw: '{' })).status, 400);
      assert.equal(await userQuery.count({}), 0);
    });

    let registered;
    await check('native registration persists a member and returns real access and refresh tokens', async () => {
      registered = await call('/auth/local/register', { data: { username: email, email, password, fullName: 'Synthetic Member' } });
      assert.equal(registered.status, 200);
      assert.equal(typeof registered.body.jwt, 'string');
      assert.equal(registered.body.user.email, email);
      assert.equal(typeof registered.body.refreshToken, 'string');
      assert.equal((await userQuery.findOne({ where: { email } })).confirmed, true);
      assert.equal(messages.length, 0, 'Registration notifications are explicitly disabled');
    });

    await check('member JWT reads the real authenticated profile; incorrect password is rejected', async () => {
      const profile = await call('/users/me', { method: 'GET', jwt: registered.body.jwt });
      assert.equal(profile.status, 200);
      assert.equal(profile.body.email, email);
      assert.equal((await call('/auth/local', { data: { identifier: email, password: 'wrong-synthetic-password' } })).status, 400);
      assert.equal((await call('/auth/local', { data: { identifier: email, password } })).status, 200);
    });

    let resetCode;
    await check('forgot-password renders a staging-only reset link to a local mail sink; unknown members do not send mail', async () => {
      assert.equal((await call('/auth/forgot-password', { data: { email } })).status, 200);
      assert.equal(messages.length, 1);
      assert.equal(messages[0].to, email);
      assert.match(messages[0].html, /https:\/\/staging\.suremandarin\.example\.invalid\/en\/reset-password\?code=/);
      resetCode = messages[0].html.match(/reset-password\?code=([a-f0-9]+)/)?.[1];
      assert.equal(resetCode?.length, 128);
      assert.equal((await userQuery.findOne({ where: { email } })).resetPasswordToken, resetCode);
      assert.equal((await call('/auth/forgot-password', { data: { email: 'unknown-member@example.invalid' } })).status, 200);
      assert.equal(messages.length, 1);
    });

    let reset;
    await check('password reset updates real credentials, clears its token and prevents sequential reuse', async () => {
      assert.equal((await call('/auth/reset-password', { data: { code: resetCode, password: newPassword, passwordConfirmation: 'mismatch' } })).status, 400);
      reset = await call('/auth/reset-password', { data: { code: resetCode, password: newPassword, passwordConfirmation: newPassword } });
      assert.equal(reset.status, 200);
      assert.equal(typeof reset.body.jwt, 'string');
      assert.equal((await userQuery.findOne({ where: { email } })).resetPasswordToken, null);
      assert.equal((await call('/auth/reset-password', { data: { code: resetCode, password: newPassword, passwordConfirmation: newPassword } })).status, 400);
      assert.equal((await call('/auth/local', { data: { identifier: email, password } })).status, 400);
      assert.equal((await call('/auth/local', { data: { identifier: email, password: newPassword } })).status, 200);
    });

    await check('real session refresh and logout revoke the synthetic member refresh token', async () => {
      const login = await call('/auth/local', { data: { identifier: email, password: newPassword } });
      assert.equal(login.status, 200);
      assert.match(login.headers.get('set-cookie') || '', /httponly/i);
      assert.match(login.headers.get('set-cookie') || '', /secure/i);
      const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
      assert.match(cookie, /^strapi_up_refresh=/);
      const refresh = await call('/auth/refresh', { cookie });
      assert.equal(refresh.status, 200);
      assert.equal(typeof refresh.body.jwt, 'string');
      const updatedCookie = (refresh.headers.get('set-cookie') || '').split(';')[0] || cookie;
      const logout = await call('/auth/logout', { cookie: updatedCookie, jwt: refresh.body.jwt });
      assert.equal(logout.status, 200);
      assert.equal(logout.body.ok, true);
      const revoked = await call('/auth/refresh', { cookie: updatedCookie });
      assert.equal(revoked.status, 401);
    });

    await check('optional email confirmation blocks login until the real confirmation link is consumed', async () => {
      const store = strapi.store({ type: 'plugin', name: 'users-permissions' });
      const advanced = await store.get({ key: 'advanced' });
      await store.set({ key: 'advanced', value: { ...advanced, email_confirmation: true,
        email_confirmation_redirection: 'https://staging.suremandarin.example.invalid/en/login' } });
      const templates = await store.get({ key: 'email' });
      templates.email_confirmation.options.from = { name: 'Smoke Test', email: 'account@example.invalid' };
      await store.set({ key: 'email', value: templates });
      const confirmationEmail = 'confirm-member@example.invalid';
      const registration = await call('/auth/local/register', { data: { username: confirmationEmail, email: confirmationEmail, password } });
      assert.equal(registration.status, 200);
      assert.equal(registration.body.jwt, undefined);
      assert.equal((await call('/auth/local', { data: { identifier: confirmationEmail, password } })).status, 400);
      assert.equal(messages.length, 2);
      assert.equal(messages[1].to, confirmationEmail);
      const code = messages[1].html.match(/confirmation=([a-f0-9]+)/)?.[1];
      assert.equal(code?.length, 40);
      assert(messages[1].html.includes(`${origin}/api/auth/email-confirmation`));
      const confirm = await call(`/auth/email-confirmation?confirmation=${code}`, { method: 'GET', trusted: false });
      assert.equal(confirm.status, 302);
      assert.equal(confirm.headers.get('location'), 'https://staging.suremandarin.example.invalid/en/login');
      assert.equal((await call('/auth/local', { data: { identifier: confirmationEmail, password } })).status, 200);
      assert.equal((await userQuery.findOne({ where: { email: confirmationEmail } })).confirmed, true);
    });

    console.log(`STRAPI_SMOKE_RESULT ${JSON.stringify({ checksPassed: checks, members: await userQuery.count({}),
      mailSinkMessages: messages.length, blockedNetworkAttempts, realMailDelivered: false,
      database: 'disposable SQLite', transport: 'loopback only', productionCredentialsRead: false })}`);
  } finally {
    await strapi.destroy();
  }
}

(process.argv[2] === '--isolated-child' ? runIsolated(process.argv[3]) : orchestrate()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
