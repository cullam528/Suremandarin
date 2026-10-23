/* eslint-disable @typescript-eslint/no-require-imports -- Configuration tests use synthetic VM environments, never deployment secrets. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const valid = {
  NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
  STRAPI_URL: 'https://cms.example.test',
  TURNSTILE_SECRET_KEY: 'synthetic-private-key-for-config-tests',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'synthetic-public-key-for-config-tests',
  TURNSTILE_HOSTNAMES: 'website.example.test',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'synthetic-redis-token-for-config-tests',
  AUTH_RATE_LIMIT_PREFIX: 'staging_stable-namespace',
  AUTH_GATEWAY_SECRET: 'e9'.repeat(32),
};
const variables = [
  'TURNSTILE_SECRET_KEY', 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'AUTH_GATEWAY_SECRET',
  'UPSTASH_REDIS_REST_TOKEN', 'AUTH_RATE_LIMIT_PREFIX', 'TURNSTILE_HOSTNAMES',
  'UPSTASH_REDIS_REST_URL', 'STRAPI_URL',
];
function compile(relativePath) {
  return ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}
const configCode = compile('src/lib/auth-security-config.ts');
const nextCode = compile('next.config.ts');
function load(env) {
  const exports = {};
  const process = { env: { ...env }, cwd: () => '/isolated/config-test' };
  vm.runInNewContext(configCode, { exports, URL, process }, { filename: 'isolated-auth-security-config.ts' });
  return {
    ...exports,
    nextConfig() {
      const nextExports = {};
      vm.runInNewContext(nextCode, {
        exports: nextExports, process,
        require(name) { assert.equal(name, './src/lib/auth-security-config'); return exports; },
      }, { filename: 'isolated-next.config.ts' });
      return nextExports.default;
    },
  };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }
function genericFailure(api) {
  assert.throws(() => api.getAuthSecurityConfig(), (error) => {
    assert.equal(error.status, 503); assert.equal(error.code, 'SECURITY_UNAVAILABLE');
    assert.equal(error.message, 'Security verification is temporarily unavailable. Please try again later.');
    assert.equal(error.issues, undefined);
    return true;
  });
}

test('missing configuration reports all eight variables while runtime keeps its generic 503', () => {
  const api = load({ NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview' });
  assert.deepEqual(plain(api.getAuthSecurityConfigIssues()), variables.map((variable) => ({ variable, reason: 'missing' })));
  assert.throws(() => api.assertAuthSecurityBuildConfig(), (error) => {
    for (const variable of variables) assert.ok(error.message.includes(`${variable} (missing)`));
    return true;
  });
  genericFailure(api);
});

test('invalid configuration aggregates fixed reasons without exposing credentials or URL parser errors', () => {
  const bad = {
    ...valid,
    TURNSTILE_SECRET_KEY: 'secret-SENTINEL_PRIVATE$!',
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'public-SENTINEL_PUBLIC$!',
    AUTH_GATEWAY_SECRET: 'SENTINEL_GATEWAY',
    UPSTASH_REDIS_REST_TOKEN: 'Bearer SENTINEL_REDIS_TOKEN',
    AUTH_RATE_LIMIT_PREFIX: 'SENTINEL:prefix',
    TURNSTILE_HOSTNAMES: 'https://SENTINEL.invalid',
    UPSTASH_REDIS_REST_URL: 'https://user:SENTINEL_URL_PASSWORD@redis.example.test?key=SENTINEL_QUERY',
    STRAPI_URL: 'SENTINEL-malformed-backend-url',
  };
  const api = load(bad);
  const issues = plain(api.getAuthSecurityConfigIssues());
  assert.deepEqual(issues, variables.map((variable) => ({ variable, reason: 'invalid' })));
  assert.doesNotMatch(JSON.stringify(issues), /SENTINEL/);
  assert.throws(() => api.assertAuthSecurityBuildConfig(), (error) => {
    assert.doesNotMatch(`${error.message}\n${error.stack}\n${JSON.stringify(error)}`, /SENTINEL/);
    assert.equal(error.cause, undefined);
    for (const variable of variables) assert.ok(error.message.includes(`${variable} (invalid)`));
    return true;
  });
  genericFailure(api);
});

test('Preview, Production and self-hosted optimized builds all keep the strict configuration gate', () => {
  for (const platform of [{ VERCEL: '1', VERCEL_ENV: 'preview' }, { VERCEL: '1', VERCEL_ENV: 'production' }, {}]) {
    const api = load({ NODE_ENV: 'production', ...platform });
    assert.throws(() => api.nextConfig(), /Account security configuration blocks this build/);
    genericFailure(api);
  }
  const development = load({ NODE_ENV: 'development' });
  assert.ok(development.nextConfig());
  genericFailure(development);
});

test('hosted Preview and Production both continue rejecting public provider test keys', () => {
  for (const VERCEL_ENV of ['preview', 'production']) {
    const api = load({ ...valid, VERCEL_ENV, TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA', NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' });
    assert.deepEqual(plain(api.getAuthSecurityConfigIssues()), [
      { variable: 'TURNSTILE_SECRET_KEY', reason: 'invalid' },
      { variable: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY', reason: 'invalid' },
    ]);
    assert.throws(() => api.nextConfig(), /TURNSTILE_SECRET_KEY \(invalid\)/);
    genericFailure(api);
  }
});

test('valid configuration retains the existing normalized contract and passes build validation', () => {
  const api = load({ ...valid, TURNSTILE_SECRET_KEY: ` ${valid.TURNSTILE_SECRET_KEY} `, TURNSTILE_HOSTNAMES: ' WEBSITE.EXAMPLE.TEST, other.example.test ', UPSTASH_REDIS_REST_URL: 'https://redis.example.test/' });
  assert.deepEqual(plain(api.getAuthSecurityConfigIssues()), []);
  assert.equal(api.assertAuthSecurityBuildConfig(), undefined);
  assert.ok(api.nextConfig());
  assert.deepEqual(plain(api.getAuthSecurityConfig()), {
    secretKey: valid.TURNSTILE_SECRET_KEY, siteKey: valid.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    gatewaySecret: valid.AUTH_GATEWAY_SECRET, redisToken: valid.UPSTASH_REDIS_REST_TOKEN,
    redisUrl: 'https://redis.example.test', prefix: valid.AUTH_RATE_LIMIT_PREFIX,
    hostnames: ['website.example.test', 'other.example.test'],
  });
});

test('legacy backend fallback is preserved and diagnostics identify the variable actually used', () => {
  const fallback = { ...valid, STRAPI_URL: undefined, NEXT_PUBLIC_STRAPI_URL: 'https://cms.example.test' };
  assert.deepEqual(plain(load(fallback).getAuthSecurityConfigIssues()), []);
  const bad = load({ ...fallback, NEXT_PUBLIC_STRAPI_URL: 'invalid-SENTINEL-backend' });
  assert.deepEqual(plain(bad.getAuthSecurityConfigIssues()), [{ variable: 'NEXT_PUBLIC_STRAPI_URL', reason: 'invalid' }]);
  genericFailure(bad);
  assert.deepEqual(plain(load({ ...fallback, STRAPI_URL: '' }).getAuthSecurityConfigIssues()), [{ variable: 'STRAPI_URL', reason: 'missing' }]);
});
