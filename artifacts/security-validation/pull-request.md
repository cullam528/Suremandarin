# Harden account CAPTCHA verification and distributed rate limiting

The existing puzzle returns its target to the browser, uses a public signing-key fallback when configuration is absent, and keeps replay/rate-limit state per process. This change replaces it with server-validated Turnstile, atomic shared Redis limits/replay claims, and a trusted gateway guard on Strapi native local-account endpoints.

Protects login, registration, forgot-password and reset-password. Missing configuration or security-service failures fail closed. Existing Strapi throttling and OAuth flows are retained. The server forwards only a validated client identity so users do not all share a Vercel egress-IP quota. CAPTCHA-less traffic cannot consume a victim's account budget.

Validation includes the complete frontend/backend suites, six isolated baseline reproductions, production builds/type checks, and real Redis multi-process concurrency tests. Four processes admit only ten of twenty-four login attempts; sixteen concurrent duplicate tokens have one winner. Actual provider configuration, email delivery and production account flows remain unverified.

Keep this PR as a draft until staging Turnstile/Upstash integration, ingress and coordinated rollout are validated. No production secret was read and no production deployment was changed. Do not merge/deploy without an authorized release decision.

[Full report and latest test results](https://github.com/cullam528/Suremandarin/blob/security/auth-hardening-20261023/docs/auth-security-hardening-2026-10-23.md)

[Baseline evidence](https://github.com/cullam528/Suremandarin/blob/security/auth-hardening-20261023/artifacts/security-baseline/README.md)

Remaining priority: review dependency advisories against the unchanged Next.js 16.2.12 lockfile. This targeted fix is not a whole-site security audit.
