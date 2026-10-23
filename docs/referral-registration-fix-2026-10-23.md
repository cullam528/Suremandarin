# Invitation registration and referral rewards — 2026-10-23

## Scope and reproduced failures

Based on `main` commit `76a9604`. No production data was read or changed, and no historical reward was issued.

The first regression run executed the actual Next registration/OAuth route handlers: **23 tests, 19 passed, 4 failed**. Local registration omitted `referredByCode`; Google, LinkedIn and Twitter each omitted the invitation from the Strapi callback exchange. An additional invitation-page render test reproduced `ReferenceError: window is not defined`.

The investigation also found that Strapi's registration allowlist omitted the invitation field, social registration sources did not fit the referral source enum, and the account page fabricated fallback invitation codes that were not stored on a member. Real database tests then demonstrated that `unique: true` alone did not create SQL uniqueness constraints in the installed Strapi database layer.

## Resulting contract

- The URL remains `?ref=<inviter-code>`. Registration uses `referredByCode` end to end. Next accepts the old `referralCode` request alias for stale web clients, but sends only the canonical field to Strapi. `referralCode` on a member is their own server-generated sharing code.
- OAuth passes invitation context saved when registration began. Callback URL fields cannot override that context. Strapi first verifies the provider profile with the existing adapter and applies the code only when the provider service creates a new account. Existing accounts keep their current identity and receive no new referral or trial.
- Unknown, malformed, oversized, blocked-inviter and self-referral codes do not grant credit. Ordinary registration remains usable. Existing emails (including legacy mixed-case records) cannot create another account to claim a trial, even if provider unique-email configuration is relaxed. This is account/email protection, not proof that two different emails belong to different humans.
- A new member receives a random persisted sharing code. An existing member without one gets a code on their own authenticated `/users/me` request. This operation does not change their inviter or issue credit. The UI no longer invents fallback codes.
- Account creation, referral creation, the trial credit and referral counter changes commit together. Failures roll back; retrying does not leave an orphan account or partial reward. Registration notifications run after commit. Remote OAuth verification runs outside the database transaction.
- User row locks serialize credit grants across workers; SQL constraints protect new registration identities, one referral per new registration/email identity, owned invitation codes and ledger source keys. Public user/referral mutations cannot set referral or reward fields. Admin content management remains separate.

## Business rules preserved

The invited new member receives **one available trial hour**, sharing the existing `trial-lesson-v1:<userId>` identity with the Daily Challenge reward. Existing legacy `daily-7-day-v1` and `referral-trial-v1` credits also prevent another trial, including credits already used/revoked/expired. A repeat request never restores a spent credit.

The inviter receives no credit simply for another registration. The existing rule remains **2 hours pending approval for each 3 paid referrals after the refund window**. Refunded, rejected or immature referrals do not qualify. Batch source keys retain idempotency.

## Verification

Run from the respective project directories:

```sh
# frontend
node --test scripts/*.test.cjs
npx tsc --noEmit
npm run build

# backend
node --test tests/*.test.cjs src/api/article/controllers/article.test.cjs
npx tsc --noEmit --incremental false
npm run build
```

The frontend tests execute actual form/request/OAuth route code with controlled transport. The backend integration tests execute the installed Strapi authentication controllers, provider services, real database queries/lifecycles and SQL constraints against disposable databases. Provider identity responses and token delivery are synthetic; no live Google, LinkedIn or Twitter account was registered. The focused harness substitutes the Document Service boundary and does not boot the production application or load `.env` files.

Default integration storage is a temporary SQLite file. PostgreSQL CI uses an isolated service and a random schema per test. Optional `REFERRAL_TEST_POSTGRES_URL` accepts loopback hosts and only the dedicated `suremandarin_referral_test` database; schemas are removed after the run. `.github/workflows/referral-registration-tests.yml` runs both database variants.

Frontend production-build verification uses a disposable local public-CMS fixture, because the unconfigured default CMS endpoint timed out. This verifies the build without relying on production content availability.

## Deployment and historical review

Deploy the backend schema/contract before the frontend. The new registration/referral identity columns are nullable and have no historical backfill. Adding SQL uniqueness to existing `up_users.referral_code` and `lesson_credits.source_key` requires a **read-only preflight** on the deployment database (use its configured schema):

```sql
SELECT referral_code, COUNT(*)
FROM up_users WHERE referral_code IS NOT NULL
GROUP BY referral_code HAVING COUNT(*) > 1;

SELECT source_key, COUNT(*)
FROM lesson_credits WHERE source_key IS NOT NULL
GROUP BY source_key HAVING COUNT(*) > 1;
```

If either query returns rows, stop the rollout and investigate. Do not automatically delete records, change relationships or grant/revoke credit to satisfy a constraint. This PR includes no deduplication, relationship repair or reward backfill script.

A separate read-only historical investigation is still needed to establish affected counts. Compare registration dates/provider/email, persisted `referredByCode`, existing referral relations and all unified/legacy trial credits. Review retained registration/request/campaign evidence where available. A missing relation alone does not prove an invitation occurred, and the old lost code or fabricated fallback link may be unrecoverable. Do not infer an inviter from display names or assign a reward to an existing account based only on a new invitation URL. Any correction or backfill requires a reviewed list with evidence and explicit approval.
