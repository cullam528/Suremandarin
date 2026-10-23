# Account security hardening — 2026-10-23

Base: `main` at `76a9604c6f31985070e0adac6de87813dc04a002`. Branch: `security/auth-hardening-20261023`.

This change has been tested in an isolated checkout. No production secrets were read, no production account requests were sent, and no production deployment was changed. Production configuration and any historical compromise remain unverified.

## Confirmed defects and fixes

The [offline baseline](../artifacts/security-baseline/README.md) has six executable reproductions. Even with a configured signing key, the old puzzle accepted returned target coordinates plus invented timing/movement fields. Separate processes accepted the same proof and maintained independent request budgets. The public fallback key was exploitable in the isolated test when all configured keys were absent; this does **not** establish that production used that fallback.

- Removed the custom puzzle verifier, public bootstrap secret, JWT-secret fallback and in-process security Maps. The old challenge endpoint returns `410` with a reload instruction and no challenge data.
- Replaced the client with Cloudflare Turnstile and required server-side Siteverify. The server checks provider success, exact configured hostname, expected action and a challenge timestamp younger than five minutes. Browser-supplied motion/timing claims no longer authorize requests.
- Cloudflare's single-use verification is reinforced by an atomic Redis `SET NX EX` claim before a protected action. No successful result is cached locally.
- Added a Redis sliding-window limiter with one atomic Lua `EVAL`, Redis server time, expiry and unique attempt IDs. The same Redis endpoint and prefix are used by every frontend instance. No process-local fallback is permitted.
- Kept existing limits per 15 minutes: login 10, registration 6, forgot-password 5, reset-password 8. Also apply those limits to normalized account identifiers (hashed), or the reset code. IP limits run before parsing/verification; **account** limits run only after CAPTCHA succeeds, so CAPTCHA-less traffic cannot consume a victim's global account budget. Verified failed passwords still count.
- Vercel requests use its platform-supplied `x-vercel-forwarded-for`; outside Vercel, only an explicitly configured trusted ingress header is considered. Missing/invalid identities share a conservative bucket. IPv6 addresses are canonicalized and grouped by /64. Redis keys contain HMAC digests, not addresses, emails or reset codes.
- Added a Strapi middleware gate for native local-account endpoints and their local callback alias. Requests require a separate server-only gateway credential, checked in constant time. Existing Strapi rate limiting remains enabled. After gateway authentication, a validated `x-auth-client-ip` preserves end-user buckets instead of aggregating all users behind Vercel's outbound IP. Raw public forwarded headers are not accepted as authorization.
- Bounded auth bodies to 16 KiB, added explicit provider/storage/upstream timeouts, prohibited redirect-following on credential-bearing calls, and return `429` with `Retry-After` or `503` without invoking account operations on security-service failures.
- Kept bilingual retry/expiry/error states, retained form input after failures and refresh the CAPTCHA after consumed-token failures. Register responses requiring email confirmation may legitimately lack a JWT; the form shows bilingual confirmation instructions instead of opening an account page without a session. Login/reset malformed success responses cannot create sessions.
- Corrected backend URL precedence: server-only `STRAPI_URL` wins, explicitly configured loopback URLs are respected, and missing local configuration no longer silently sends requests to the production API.

## Required deployment configuration

Configure these through the hosting/provider dashboards; do not paste their values into a PR, issue, chat or logs. The committed examples are blank. No production keys are needed to run the offline tests.

| Setting | Where | Requirement |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Frontend build and runtime | Public widget key for the intended environment |
| `TURNSTILE_SECRET_KEY` | Frontend server only | Matching Siteverify secret; no default or JWT reuse |
| `TURNSTILE_HOSTNAMES` | Frontend server | Exact comma-separated hostname allowlist; no scheme, wildcard or path |
| `UPSTASH_REDIS_REST_URL` | Frontend server | HTTPS REST endpoint, shared across instances |
| `UPSTASH_REDIS_REST_TOKEN` | Frontend server | Credential permitting `EVAL` and `SET`; never a public variable |
| `AUTH_RATE_LIMIT_PREFIX` | Frontend server | Stable 1–64 character alphanumeric/underscore/hyphen namespace; different for staging and production |
| `AUTH_GATEWAY_SECRET` | Frontend and Strapi server | Same independently generated 32 random bytes encoded as 64 hex characters |
| `STRAPI_URL` | Frontend server | Explicit backend origin; HTTPS except local loopback; server setting wins over legacy public setting |
| `AUTH_TRUSTED_IP_HEADER` | Self-hosted frontend only | Optional ingress-overwritten header; origin must be unreachable except through that ingress |

Production frontend builds and protected runtime requests reject missing/malformed configuration and known Turnstile test keys. Strapi production startup rejects a missing/malformed gateway credential. Format validation cannot establish actual key randomness, ownership or provider validity; these need an authorized operator's staging check. Public and server Turnstile configuration must be rebuilt/deployed together. `CAPTCHA_SECRET` is retired.

Use a dedicated staging widget, Redis database/namespace and gateway credential. Do not reuse production secrets in tests. Prefer a single configured Redis writer endpoint and retain expiring keys; configure adequate quotas and no eviction of active security keys. Do not derive the prefix from deployment IDs. Rotating the gateway secret also changes HMAC rate keys and resets their budgets; coordinate the frontend/backend switch and account for a 15-minute observation window.

## Rollout and verification required before merge/deployment

1. Provision the staging Turnstile widget and shared Redis service. The implementation uses their documented HTTPS APIs without adding runtime SDK dependencies. Confirm regional availability and acceptable privacy terms for the audience.
2. Configure both staging services and build the frontend with the correct public site key. Confirm actual Siteverify success for each action/hostname, provider rejection for expired/replayed tokens, and Redis outage behavior. Do not replace Siteverify with a success stub in a hosted environment.
3. Check trusted client identity through the actual ingress, two frontend instances, IPv4/IPv6, and users behind shared networks. Confirm genuine failures return actionable errors and quota limits suit observed traffic.
4. Verify direct Strapi local endpoints deny requests without the gateway header, including trailing-slash/case/local-callback aliases. Verify native email-confirmation **sending** is intentionally gated; the current frontend has no resend UI. Admin login and existing real OAuth callbacks are preserved.
5. Run real staging registration, email confirmation (if enabled), incorrect/correct password login, password reset email/link, session cookie and logout flows. Offline tests validate route contracts; they do not establish successful delivery of real mail or provider integration.
6. Coordinate frontend and backend release. Deploy the protected frontend with the shared gateway header/config first, verify it, then enable the backend gate in a controlled release. The interval before the backend gate is live remains bypassable at the origin, so keep it short or restrict origin access during the change. If the backend gate is released first, old frontend instances will be denied until replaced. Plan rollback of both components; do not silently disable the gate or restore the public fallback.
7. Inventory any mobile/third-party consumers of Strapi native auth before enabling the gate. Those clients must use a protected gateway flow; never distribute the server gateway credential to them.

## Actual tests in this checkout

Installed frontend and backend dependencies from their existing pnpm lockfiles with lifecycle scripts disabled. No runtime dependency/lockfile upgrades are included.

| Validation | Actual result |
| --- | --- |
| Pre-change related frontend tests | 51 passed |
| Offline baseline vulnerability reproductions | 6 passed |
| Full frontend suite, including real Redis integration | 202 passed, 0 failed, 0 skipped |
| Full backend suite (root tests and article controller tests) | 43 passed, 0 failed |
| Frontend and backend TypeScript checks | Passed |
| Frontend and backend production builds | Passed; frontend used synthetic config and a read-only loopback CMS fixture |
| Production build with missing security config | Rejected as expected before build |
| Frontend ESLint | 0 errors; 2 pre-existing useMemo dependency warnings in MyCoursesPanel.tsx |
| Local browser smoke check | Login page rendered; blocked CAPTCHA loading produced an error and disabled submit |

Redis integration ran on a disposable **Redis 7.4.7** bound to loopback, with no persistence and an HTTP test bridge. Four independent Node processes shared that Redis: 24 simultaneous login attempts admitted exactly 10; a new process stayed blocked; registration/forgot/reset quotas were also shared. Sixteen concurrent duplicate CAPTCHA submissions admitted one, even though the isolated Siteverify stub deliberately returned success to all processes. Tests also verify expiry of the actual Lua window and the replay record TTL. The real managed Upstash service and real Turnstile Siteverify were **not** claimed as validated.

Reproduction commands (from the corresponding directories):

```sh
# frontend; Redis integration skips explicitly unless a local binary is available.
AUTH_TEST_REDIS_SERVER=/absolute/path/to/redis-server npm test
npm run test:security
npm run lint
# backend
npm test
npm run build
# repository root
node --test artifacts/security-baseline/reproduce.cjs
```

For continuous validation, install a local Redis binary and set `AUTH_TEST_REDIS_SERVER` so distributed tests cannot be mistaken for a run in which Redis tests were skipped.

## Remaining risks and unknowns

- No evidence was gathered that accounts were attacked or that the historical public key was active in production. Do not treat the reproduction as an incident finding.
- Real Turnstile registration, hostname configuration, CSP/browser/regional reachability, privacy review, Redis credentials/quota/eviction, production proxy trust and upstream email behavior still require staging validation. CAPTCHA is not a guarantee against sophisticated automation or CAPTCHA-solving services.
- NAT/shared-network users still share IP budgets; a bot with valid human verification can consume an account budget. Monitor 429/503 rates and tune thresholds using real traffic before broad rollout. Never tune by disabling verification.
- Redis scripts provide atomic decisions at the writer. Upstash documents asynchronous replication/failover and network-partition consistency limits; this implementation does not promise absolute consistency through provider data loss/partitions. Cloudflare single-use checks independently back replay protection. Availability failures deliberately block account operations with 503.
- The gateway credential is a bearer secret over TLS. Compromise of the frontend/server credential or request-header logging defeats that trust boundary; redact `x-auth-gateway-secret`, rotate it in both services and restrict origin network access where feasible.
- OAuth, authenticated password-change routes and unrelated business APIs are not migrated to this gateway flow. Existing OAuth tests pass, but these remain outside this targeted audit.
- The **unchanged frontend lockfile** has additional dependency advisories. `pnpm audit --json` reported 5 critical, 15 high, 7 moderate and 1 low findings (advisory counts, not proof of application exploitability). Next.js is pinned at 16.2.12. Prioritize a separate compatible dependency update; for example the maintainers identify 16.4.1 as patched for the October 14 image-optimization and typed-array cache advisories below. This PR does not establish whole-site security or fix those dependencies.

## Primary references

- [Cloudflare server-side verification, expiry and single use](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Upstash Redis REST API](https://upstash.com/docs/redis/features/restapi)
- [Upstash Lua EVAL and Redis TIME](https://upstash.com/docs/redis/commands/scripting/eval#time-inside-a-script)
- [Upstash consistency and failure boundaries](https://upstash.com/docs/redis/features/consistency)
- [Vercel request header handling](https://vercel.com/docs/headers/request-headers)
- [Next.js image-optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw)
- [Next.js typed-array cache advisory](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr)
