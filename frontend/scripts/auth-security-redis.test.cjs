/* eslint-disable @typescript-eslint/no-require-imports -- Optional offline integration against a disposable local Redis process. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync, execFile } = require('node:child_process');
const { once } = require('node:events');
const { promisify } = require('node:util');
const { setTimeout: pause } = require('node:timers/promises');
const ts = require('typescript');
const execFileAsync = promisify(execFile);
const gatewaySecret = 'c8'.repeat(32);
const syntheticRedisToken = 'offline-bridge-auth';
const sharedCaptcha = 'offline-real-redis-shared-captcha';

function loadSecurity(redisUrl, prefix) {
  const env = {
    NODE_ENV: 'test', STRAPI_URL: 'https://cms.example.test', AUTH_TRUSTED_IP_HEADER: 'x-test-client-ip',
    TURNSTILE_SECRET_KEY: 'synthetic-server-key-for-offline-tests',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'synthetic-public-key-for-offline-tests',
    TURNSTILE_HOSTNAMES: 'website.example.test',
    UPSTASH_REDIS_REST_URL: redisUrl, UPSTASH_REDIS_REST_TOKEN: syntheticRedisToken,
    AUTH_RATE_LIMIT_PREFIX: prefix, AUTH_GATEWAY_SECRET: gatewaySecret,
  };
  const cache = new Map();
  function load(name) {
    const filename = path.join(__dirname, '../src/lib', `${name}.ts`);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(compiled, {
      exports, Buffer, URL, Date, Response, AbortSignal, process: { env },
      fetch: async (url, options) => {
        if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
          // Every process deliberately receives success, proving Redis claim atomicity independently.
          return Response.json({ success: true, action: 'login', hostname: 'website.example.test', challenge_ts: new Date(Date.now() - 1000).toISOString() });
        }
        assert.equal(url, redisUrl, 'The only real network destination must be this test\'s loopback bridge');
        return fetch(url, options);
      },
      require(dependency) {
        if (dependency === 'server-only') return {};
        if (dependency === 'node:crypto') return crypto;
        if (dependency === 'node:net') return net;
        if (dependency === './auth-security-config') return load('auth-security-config');
        throw new Error(`Unexpected test import ${dependency}`);
      },
    }, { filename });
    return exports;
  }
  return load('auth-security');
}

async function worker() {
  const [, , , redisUrl, prefix, mode, action, countText] = process.argv;
  const api = loadSecurity(redisUrl, prefix);
  const attempts = Array.from({ length: Number(countText) }, async () => {
    try {
      if (mode === 'captcha') return await api.verifyCaptcha({ token: sharedCaptcha }, 'login') ? 'allowed' : 'replay';
      const request = new Request('http://website.example.test/api/auth/login', { headers: { 'x-test-client-ip': '192.0.2.10' } });
      await api.enforceIpLimit(request, action);
      return 'allowed';
    } catch (error) {
      if (error.status === 429) return 'limited';
      throw error;
    }
  });
  const results = await Promise.all(attempts);
  process.stdout.write(JSON.stringify(results));
}

// Minimal RESP client; every connection is explicitly bound to the disposable localhost instance.
function parseReply(buffer, position = 0) {
  const newline = buffer.indexOf('\r\n', position);
  if (newline === -1) return undefined;
  const type = String.fromCharCode(buffer[position]), text = buffer.toString('utf8', position + 1, newline);
  const next = newline + 2;
  if (type === '+') return { value: text, next };
  if (type === '-') return { value: new Error(text), next };
  if (type === ':') return { value: Number(text), next };
  if (type === '$') {
    const length = Number(text);
    if (length === -1) return { value: null, next };
    if (buffer.length < next + length + 2) return undefined;
    return { value: buffer.toString('utf8', next, next + length), next: next + length + 2 };
  }
  if (type === '*') {
    const length = Number(text), value = [];
    if (length === -1) return { value: null, next };
    let cursor = next;
    for (let i = 0; i < length; i++) {
      const child = parseReply(buffer, cursor);
      if (!child) return undefined;
      value.push(child.value); cursor = child.next;
    }
    return { value, next: cursor };
  }
  throw new Error(`Unexpected RESP marker ${type}`);
}
function redisCommand(port, command) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    let response = Buffer.alloc(0);
    const timeout = setTimeout(() => socket.destroy(new Error('Disposable Redis timed out')), 5000);
    socket.once('error', reject);
    socket.once('close', () => clearTimeout(timeout));
    socket.once('connect', () => socket.write(`*${command.length}\r\n${command.map((part) => `$${Buffer.byteLength(String(part))}\r\n${part}\r\n`).join('')}`));
    socket.on('data', (chunk) => {
      response = Buffer.concat([response, chunk]);
      const parsed = parseReply(response);
      if (!parsed) return;
      socket.end();
      if (parsed.value instanceof Error) reject(parsed.value); else resolve(parsed.value);
    });
  });
}

if (process.argv[2] === '--worker') {
  worker().catch((error) => { process.stderr.write(`${error.stack}\n`); process.exitCode = 1; });
} else {
  const { describe, it, before, after } = require('node:test');
  const redisBinary = process.env.AUTH_TEST_REDIS_SERVER || 'redis-server';
  const available = spawnSync(redisBinary, ['--version'], { encoding: 'utf8', timeout: 3000 });
  if (process.env.AUTH_TEST_REDIS_SERVER && available.status !== 0) throw new Error('AUTH_TEST_REDIS_SERVER does not point to an executable Redis server');
  describe('real Redis atomic security integration', { skip: available.status === 0 ? false : 'Set AUTH_TEST_REDIS_SERVER to a local redis-server executable to run the optional offline integration.' }, () => {
    let redis, bridge, redisPort, redisUrl, directory;
    before(async () => {
      directory = fs.mkdtempSync(path.join(os.tmpdir(), 'suremandarin-auth-redis-'));
      const reservation = net.createServer();
      reservation.listen(0, '127.0.0.1'); await once(reservation, 'listening');
      redisPort = reservation.address().port;
      await new Promise((resolve) => reservation.close(resolve));
      redis = spawn(redisBinary, ['--bind', '127.0.0.1', '--port', String(redisPort), '--save', '', '--appendonly', 'no', '--dir', directory, '--protected-mode', 'yes'], { stdio: 'ignore' });
      for (let attempt = 0; ; attempt++) {
        try { assert.equal(await redisCommand(redisPort, ['PING']), 'PONG'); break; }
        catch (error) { if (attempt >= 100 || redis.exitCode !== null) throw error; await pause(20); }
      }
      bridge = http.createServer(async (request, response) => {
        try {
          assert.equal(request.method, 'POST'); assert.equal(request.headers.authorization, `Bearer ${syntheticRedisToken}`);
          const chunks = []; for await (const chunk of request) chunks.push(chunk);
          const command = JSON.parse(Buffer.concat(chunks).toString());
          assert.ok(['EVAL', 'SET'].includes(command[0]), 'Bridge only accepts the application command surface');
          const result = await redisCommand(redisPort, command);
          response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ result }));
        } catch (error) { response.writeHead(500, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: error.message })); }
      });
      bridge.listen(0, '127.0.0.1'); await once(bridge, 'listening');
      redisUrl = `http://127.0.0.1:${bridge.address().port}`;
    });
    after(async () => {
      if (bridge) { bridge.closeAllConnections(); await new Promise((resolve) => bridge.close(resolve)); }
      if (redis && redis.exitCode === null) { const stopped = once(redis, 'exit'); redis.kill('SIGTERM'); await stopped; }
      if (directory) fs.rmSync(directory, { recursive: true, force: true });
    });
    async function processes(prefix, mode, action, count, processCount = 4) {
      const outputs = await Promise.all(Array.from({ length: processCount }, () => execFileAsync(process.execPath, [__filename, '--worker', redisUrl, prefix, mode, action, String(count)], { timeout: 15000, env: {} })));
      return outputs.flatMap(({ stdout }) => JSON.parse(stdout));
    }
    it('24 simultaneous login attempts across four OS processes accept exactly ten; cold process cannot reset quota', async () => {
      const results = await processes('os-login', 'rate', 'login', 6);
      assert.equal(results.filter((value) => value === 'allowed').length, 10);
      assert.equal(results.filter((value) => value === 'limited').length, 14);
      assert.deepEqual(await processes('os-login', 'rate', 'login', 1, 1), ['limited']);
    });
    for (const [action, maximum] of [['register', 6], ['forgot-password', 5], ['reset-password', 8]]) {
      it(`${action} enforces the configured global quota across two OS processes`, async () => {
        const results = await processes(`os-${action}`, 'rate', action, maximum, 2);
        assert.equal(results.filter((value) => value === 'allowed').length, maximum);
        assert.equal(results.filter((value) => value === 'limited').length, maximum);
      });
    }
    it('sixteen concurrent duplicate CAPTCHA submissions across four processes have exactly one winner and a finite TTL', async () => {
      const results = await processes('os-captcha', 'captcha', 'login', 4);
      assert.equal(results.filter((value) => value === 'allowed').length, 1);
      assert.equal(results.filter((value) => value === 'replay').length, 15);
      const key = `os-captcha:auth:captcha:${crypto.createHash('sha256').update(sharedCaptcha).digest('hex')}`;
      const ttl = await redisCommand(redisPort, ['PTTL', key]);
      assert.ok(ttl > 295000 && ttl <= 300000, `Replay claim TTL should be five minutes, received ${ttl}`);
      assert.deepEqual(await processes('os-captcha', 'captcha', 'login', 1, 1), ['replay']);
    });
    it('real Lua uses the Redis clock, expires old requests and stores only expiring buckets', async () => {
      const { rateLimitScript } = loadSecurity(redisUrl, 'script-clock');
      const command = (nonce) => ['EVAL', rateLimitScript, '1', 'test-short-window', 100, 1, nonce];
      assert.deepEqual(await redisCommand(redisPort, command('first')), [1, 0]);
      const denied = await redisCommand(redisPort, command('second'));
      assert.equal(denied[0], 0); assert.ok(denied[1] > 0 && denied[1] <= 100);
      const ttl = await redisCommand(redisPort, ['PTTL', 'test-short-window']);
      assert.ok(ttl > 0 && ttl <= 100);
      await pause(120);
      assert.equal(await redisCommand(redisPort, ['EXISTS', 'test-short-window']), 0);
      assert.deepEqual(await redisCommand(redisPort, command('after-expiry')), [1, 0]);
    });
  });
}
