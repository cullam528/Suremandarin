/* eslint-disable @typescript-eslint/no-require-imports -- Isolated CommonJS harness for the real TypeScript verifier. */
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// These tests use a fake clock, a test-only secret and synthetic local challenges.
// They do not fetch or complete a live CAPTCHA and cannot access real accounts.
const testSecret = 'isolated-unit-test-captcha-secret';
const initialTime = 1_800_000_000_000;
const ttlMs = 300_000;
const modulePath = path.join(__dirname, '../src/lib/puzzle-captcha.ts');
const compiled = ts.transpileModule(fs.readFileSync(modulePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function loader() {
  let now = initialTime;
  class TestDate extends Date {
    static now() { return now; }
  }
  const loadedModule = { exports: {} };
  vm.runInNewContext(compiled, {
    exports: loadedModule.exports,
    Buffer,
    Date: TestDate,
    process: { env: { CAPTCHA_SECRET: testSecret } },
    require(request) {
      assert.equal(request, 'node:crypto', 'Unexpected dependency in isolated verifier');
      return crypto;
    },
  }, { filename: modulePath });
  return {
    ...loadedModule.exports,
    advance(milliseconds) { now += milliseconds; },
  };
}

function signEncoded(encoded) {
  const signature = crypto.createHmac('sha256', testSecret).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function signPayload(payload) {
  return signEncoded(Buffer.from(JSON.stringify(payload)).toString('base64url'));
}

function payload(overrides = {}) {
  return {
    nonce: Buffer.alloc(16, 7).toString('base64url'),
    target: 50,
    issuedAt: initialTime - 1000,
    expiresAt: initialTime - 1000 + ttlMs,
    ...overrides,
  };
}

function proof(token, overrides = {}) {
  return { token, position: 50, elapsedMs: 650, moves: 3, ...overrides };
}

test('challenge images are distinct, complete 600×240 assets matching the responsive frame', () => {
  const source = fs.readFileSync(modulePath, 'utf8');
  const paths = [...source.matchAll(/"(\/images\/captcha\/[^"?]+\.png)"/g)].map((match) => match[1]);
  assert.equal(paths.length, 2);
  const hashes = new Set();
  for (const image of paths) {
    assert.match(image, /-v2\.png$/, 'New filenames must avoid the old cropped-image cache');
    const bytes = fs.readFileSync(path.join(__dirname, '../public', image));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 600);
    assert.equal(bytes.readUInt32BE(20), 240);
    hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
  }
  assert.equal(hashes.size, paths.length, 'Do not offer duplicate images under different names');
  const css = fs.readFileSync(path.join(__dirname, '../src/components/auth/PuzzleCaptcha.module.css'), 'utf8');
  assert.match(css, /aspect-ratio:\s*600\s*\/\s*240/);
  assert.match(css, /object-fit:\s*contain/);
});

test('generated challenges retain the public contract and valid proofs are single-use', () => {
  const api = loader();
  const challenge = api.createPuzzleChallenge();
  assert.equal(typeof challenge.token, 'string');
  assert.equal(challenge.token.split('.').length, 2);
  assert(Number.isInteger(challenge.target));
  assert(challenge.target >= 24 && challenge.target <= 86);
  assert.match(challenge.image, /^\/images\/captcha\//);
  assert.equal(challenge.expiresIn, 300);
  api.advance(650);
  const valid = proof(challenge.token, { position: challenge.target });
  assert.equal(api.verifyPuzzleProof(valid), true);
  assert.equal(api.verifyPuzzleProof(valid), false);
});

test('a reported duration cannot bypass the actual server-side minimum challenge age', () => {
  const api = loader();
  const challenge = api.createPuzzleChallenge();
  const valid = proof(challenge.token, { position: challenge.target });
  assert.equal(api.verifyPuzzleProof(valid), false);
  api.advance(649);
  assert.equal(api.verifyPuzzleProof(valid), false);
  api.advance(1);
  assert.equal(api.verifyPuzzleProof(valid), true);
});

test('expiry is exclusive and replay remains invalid when consumed entries expire', () => {
  const before = loader();
  const challenge = before.createPuzzleChallenge();
  before.advance(ttlMs - 1);
  const valid = proof(challenge.token, { position: challenge.target });
  assert.equal(before.verifyPuzzleProof(valid), true);
  before.advance(1);
  assert.equal(before.verifyPuzzleProof(valid), false);

  const at = loader();
  const atChallenge = at.createPuzzleChallenge();
  at.advance(ttlMs);
  assert.equal(at.verifyPuzzleProof(proof(atChallenge.token, { position: atChallenge.target })), false);
});

test('token tampering, extra segments and noncanonical encodings are rejected', () => {
  const validToken = signPayload(payload());
  const [encoded, signature] = validToken.split('.');
  const alteredSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  const invalidTokens = [
    '', encoded, `${encoded}.`, `.${signature}`,
    `${validToken}.extra`, `${validToken}.`, `${encoded}.${alteredSignature}`,
    `${Buffer.from(JSON.stringify(payload({ target: 65 }))).toString('base64url')}.${signature}`,
    signEncoded(`${encoded}=`), signEncoded('not+base64'),
    'a'.repeat(1025), null, 123, { toString: () => validToken },
  ];
  for (const token of invalidTokens) {
    assert.equal(loader().verifyPuzzleProof(proof(token)), false);
  }
  // Malformed encodings cannot consume the legitimate challenge.
  const api = loader();
  assert.equal(api.verifyPuzzleProof(proof(`${validToken}.extra`)), false);
  assert.equal(api.verifyPuzzleProof(proof(validToken)), true);
});

test('authenticated malformed payloads fail closed without throwing', () => {
  const invalidPayloads = [
    null, [], {}, 'payload', 123,
    payload({ nonce: '' }), payload({ nonce: 'too-short' }), payload({ nonce: 'x'.repeat(23) }),
    payload({ nonce: '!' .repeat(22) }), payload({ nonce: 123 }),
    payload({ target: '50' }), payload({ target: null }), payload({ target: -1 }),
    payload({ target: 101 }), payload({ target: 50.5 }),
    payload({ issuedAt: null }), payload({ issuedAt: '1800000000000' }),
    payload({ issuedAt: -1 }), payload({ issuedAt: initialTime - 1000.5 }),
    payload({ issuedAt: initialTime + 1 }),
    payload({ expiresAt: null }), payload({ expiresAt: '1800000001000' }),
    payload({ expiresAt: initialTime + 1000.5 }),
    payload({ expiresAt: initialTime - 1000 }),
    payload({ expiresAt: initialTime - 1001 }),
    payload({ expiresAt: initialTime + ttlMs }),
    payload({ expiresAt: Number.MAX_SAFE_INTEGER + 1 }),
  ];
  for (const invalid of invalidPayloads) {
    assert.equal(loader().verifyPuzzleProof(proof(signPayload(invalid))), false, JSON.stringify(invalid));
  }
  assert.equal(loader().verifyPuzzleProof(proof(signEncoded(Buffer.from('{broken').toString('base64url')))), false);
});

test('proof fields require finite numeric values, integer moves and bounded elapsed time', () => {
  const token = signPayload(payload());
  const invalidFields = [
    { position: NaN }, { position: Infinity }, { position: -Infinity },
    { position: '50' }, { position: null }, { position: true },
    { position: -1 }, { position: 101 }, { position: 45.99 }, { position: 54.01 },
    { elapsedMs: NaN }, { elapsedMs: Infinity }, { elapsedMs: -Infinity },
    { elapsedMs: '650' }, { elapsedMs: null }, { elapsedMs: 649 },
    { elapsedMs: ttlMs + 1 }, { elapsedMs: 1001 },
    { moves: NaN }, { moves: Infinity }, { moves: -Infinity },
    { moves: '3' }, { moves: null }, { moves: 2 }, { moves: 3.5 },
    { moves: Number.MAX_SAFE_INTEGER + 1 },
  ];
  for (const fields of invalidFields) {
    assert.equal(loader().verifyPuzzleProof(proof(token, fields)), false);
  }
  for (const position of [46, 50, 54]) {
    assert.equal(loader().verifyPuzzleProof(proof(token, { position })), true);
  }
  for (const position of [0, 100]) {
    assert.equal(loader().verifyPuzzleProof(proof(signPayload(payload({ target: position })), { position })), true);
  }
});

test('empty traps stay compatible and failed attempts do not consume an otherwise valid proof', () => {
  const token = signPayload(payload());
  for (const trap of [undefined, null, '', '   ']) {
    assert.equal(loader().verifyPuzzleProof(proof(token, { trap })), true);
  }
  for (const trap of ['automated entry', 0, false, {}, []]) {
    assert.equal(loader().verifyPuzzleProof(proof(token, { trap })), false);
  }
  const api = loader();
  for (const input of [null, undefined, [], false, 1, 'text']) {
    assert.equal(api.verifyPuzzleProof(input), false);
  }
  assert.equal(api.verifyPuzzleProof(proof(token, { position: 0 })), false);
  assert.equal(api.verifyPuzzleProof(proof(token)), true);
});

test('local rate buckets enforce their limits and reset at the configured window boundary', () => {
  const api = loader();
  const request = { headers: new Headers({ 'x-forwarded-for': '192.0.2.1' }) };
  const other = { headers: new Headers({ 'x-forwarded-for': '192.0.2.2' }) };
  assert.equal(api.allowRequest(request, 'login', 2, 1000), true);
  assert.equal(api.allowRequest(request, 'login', 2, 1000), true);
  assert.equal(api.allowRequest(request, 'login', 2, 1000), false);
  assert.equal(api.allowRequest(other, 'login', 2, 1000), true);
  assert.equal(api.allowRequest(request, 'register', 2, 1000), true);
  api.advance(1000);
  assert.equal(api.allowRequest(request, 'login', 2, 1000), true);
});
