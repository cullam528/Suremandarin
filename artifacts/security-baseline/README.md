# SureMandarin isolated security baseline — 2026-10-23

Revision: `76a9604c6f31985070e0adac6de87813dc04a002` (`main` when inspected).

No production environment files, secret stores or account endpoints were read. All proofs use a fake clock, synthetic inputs and separate Node VM contexts. The historical revision is loaded with `git show`, so the reproduction remains valid after the fix. The script has no network implementation.

Run from repository root after installing frontend development dependencies:

```sh
node --test artifacts/security-baseline/reproduce.cjs
```

Actual result: **6 passed, 0 failed**.

| Observation | Isolated evidence | Conclusion |
| --- | --- | --- |
| Public fallback signing key | A synthetic token signed with the literal in the historical source verifies when `NODE_ENV=production` has no keys; the same forgery fails with a configured synthetic key | Confirmed code defect. Whether production used the fallback is unknown |
| No meaningful human proof | A challenge signed with a configured synthetic key accepts returned `target`, fixed `moves: 3`, fixed `elapsedMs: 650` after advancing the fake clock by 650 ms | Confirmed automation weakness independent of fallback secret |
| Replay state is per process | The first VM rejects a second use; an independent VM accepts the identical proof | Confirmed cross-instance replay weakness |
| Limits are per process | Two VMs each permit 10 login requests in the same 15-minute interval; a fresh VM permits another | Confirmed quota multiplication and cold-start reset |
| Client-address selection | Changing `x-forwarded-for` creates another bucket in the historical verifier | Confirmed code behavior. Whether client spoofing survives the production proxy must be verified from platform configuration |
| Existing protections | Corrupt signatures, expired tokens and premature proofs fail | These defenses work locally; the system was not entirely unprotected |

Existing pre-change tests also ran successfully: `puzzle-captcha.test.cjs`, `auth-request.test.cjs`, `auth-ui.test.cjs`, `social-auth.test.cjs`: **51 passed, 0 failed**. Passing them did not establish distributed replay/limiting protection.

## Backend boundary

`backend/config/plugins.ts` explicitly enables Strapi users-permissions rate limiting (`max: 10`, `interval: 60000`). It remains a separate defense. The repository does not configure a shared rate-limit store or an origin authentication gate for its native authentication endpoints.

The frontend forwards login, registration, forgot-password and reset-password to Strapi `/api/auth/local`, `/api/auth/local/register`, `/api/auth/forgot-password` and `/api/auth/reset-password`. It sends ordinary JSON headers. A frontend-only fix therefore leaves a bypass if the Strapi origin is publicly reachable: origin auth must enforce the same checks or accept only authenticated server gateway traffic. This is a code-level boundary finding, not a live bypass attempt. Existing mobile consumers need to be considered when restricting these endpoints.

## Isolation hazard discovered

The original `frontend/src/lib/auth.ts` overrides an explicitly configured localhost/127.0.0.1 Strapi URL with the production API URL; it also favors the public URL over the server-only URL. Local integration tests must stub fetch or use an isolated `.test` host until this is corrected. No real endpoint was contacted by this baseline.

## Production facts deliberately left unverified

- Presence, strength and environment scope of the historical secret; no secret values need to be disclosed to establish whether new requirements are configured.
- Proxy header rewriting/trust, public origin reachability and backend replica topology.
- Any real abuse, compromise, production request rates or affected accounts.
- Production CAPTCHA provider registration, hostname allowlist, shared-store connectivity, keys and quotas.

These require configuration-presence checks and staging verification by an authorized operator. They are not claims that the corresponding production weaknesses were exploited.
