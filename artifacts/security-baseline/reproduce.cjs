/* Offline baseline: compiles the pinned historical revision, never executes network requests. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'frontend/node_modules/typescript'));
const revision = '76a9604c6f31985070e0adac6de87813dc04a002';
const file = 'frontend/src/lib/puzzle-captcha.ts';
const source = execFileSync('git', ['show', `${revision}:${file}`], { cwd: root, encoding: 'utf8' });
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const initialTime = 1_800_000_000_000;
const testSecret = 'offline-test-secret-no-real-service';
function instance(env = { NODE_ENV: 'production', CAPTCHA_SECRET: testSecret }) {
  let now = initialTime;
  class TestDate extends Date { static now() { return now; } }
  const exported = {};
  vm.runInNewContext(compiled, {
    exports: exported, Buffer, Date: TestDate, process: { env },
    require(name) { assert.equal(name, 'node:crypto'); return crypto; },
  }, { filename: `${revision}/${file}` });
  return { ...exported, advance(ms) { now += ms; } };
}
function request(ip = '192.0.2.10') { return { headers: new Headers({ 'x-forwarded-for': ip }) }; }
function proof(challenge) { return { token: challenge.token, position: challenge.target, elapsedMs: 650, moves: 3, trap: '' }; }
function signedToken(secret) {
  const payload = {
    nonce: Buffer.alloc(16, 7).toString('base64url'), target: 50,
    issuedAt: initialTime - 1000, expiresAt: initialTime + 299000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${crypto.createHmac('sha256', secret).update(encoded).digest('base64url')}`;
}

test('baseline flaw: no production key accepts offline forgery signed with repository fallback', () => {
  const publicFallback = source.match(/const bootstrapSecret = "([^"]+)";/)[1];
  const forged = { token: signedToken(publicFallback), position: 50, elapsedMs: 650, moves: 3 };
  assert.equal(instance({ NODE_ENV: 'production' }).verifyPuzzleProof(forged), true);
  assert.equal(instance().verifyPuzzleProof(forged), false, 'A configured synthetic secret prevents fallback forgery');
});

test('baseline flaw: configured key still permits synthetic no-interaction proof using disclosed target', () => {
  const api = instance();
  const challenge = api.createPuzzleChallenge();
  const decoded = JSON.parse(Buffer.from(challenge.token.split('.')[0], 'base64url').toString());
  assert.equal(decoded.target, challenge.target);
  api.advance(650);
  assert.equal(api.verifyPuzzleProof(proof(challenge)), true);
});

test('baseline flaw: two isolated instances accept the same proof once each', () => {
  const first = instance();
  const second = instance();
  const challenge = first.createPuzzleChallenge();
  first.advance(650); second.advance(650);
  const synthetic = proof(challenge);
  assert.equal(first.verifyPuzzleProof(synthetic), true);
  assert.equal(first.verifyPuzzleProof(synthetic), false, 'Local replay guard works');
  assert.equal(second.verifyPuzzleProof(synthetic), true, 'Other instance has no consumed record');
});

test('baseline flaw: two instances allow 20 requests against a nominal 10-request login limit', () => {
  const first = instance(); const second = instance();
  const req = request();
  for (let i = 0; i < 10; i++) assert.equal(first.allowRequest(req, 'login', 10, 900000), true);
  assert.equal(first.allowRequest(req, 'login', 10, 900000), false);
  for (let i = 0; i < 10; i++) assert.equal(second.allowRequest(req, 'login', 10, 900000), true);
  assert.equal(second.allowRequest(req, 'login', 10, 900000), false);
  assert.equal(instance().allowRequest(req, 'login', 10, 900000), true, 'Cold instance replenishes quota');
});

test('baseline code behavior: changing forwarded address creates fresh local bucket', () => {
  const api = instance();
  for (let i = 0; i < 10; i++) assert.equal(api.allowRequest(request(), 'login', 10, 900000), true);
  assert.equal(api.allowRequest(request(), 'login', 10, 900000), false);
  assert.equal(api.allowRequest(request('192.0.2.11'), 'login', 10, 900000), true);
});

test('baseline retained defenses: bad signature, expiry and insufficient actual age are rejected', () => {
  const api = instance();
  const challenge = api.createPuzzleChallenge();
  assert.equal(api.verifyPuzzleProof(proof(challenge)), false);
  api.advance(650);
  assert.equal(api.verifyPuzzleProof({ ...proof(challenge), token: `${challenge.token}x` }), false);
  api.advance(300000);
  assert.equal(api.verifyPuzzleProof(proof(challenge)), false);
});
