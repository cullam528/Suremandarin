# PayPal reliability and reconciliation

Review date: 2026-10-23 (Asia/Shanghai). This change addresses code defects. No production transaction export or live PayPal response was available for this review, so it does not establish that a customer was billed incorrectly or that a particular production event was lost. This work does not deploy the application, replay live notifications, or change production records.

## Payment and access invariants

- An order price is an expectation, not a receipt. Store a paid amount only from a verified PayPal capture whose order association, currency, amount and completion state match the local order. Compare gross customer payment, not merchant net proceeds after fees. Do not repair zero or missing historical receipts by substituting `unitPrice` in storage or account display.
- The capture or sale identifier identifies the financial fact. An HTTP retry or a second event identifier about the same payment must not create another successful transaction or another purchase credit. Preserve the original paid timestamp on repeat processing.
- Subscription activation is a lifecycle fact, not proof of a charge. Activation alone must not fabricate `lastPaidAt`/`lastPaymentAt` or a recurring-payment ledger entry. PayPal documents last payment and next billing as distinct fields in its [subscription representation](https://developer.paypal.com/api/subscriptions/v1/definitions/subscription/).
- A signed `PAYMENT.SALE.COMPLETED` notification can record a recurring payment when its subscription, completed state, amount and currency match the subscription's billing snapshot. Use the sale ID as the ledger deduplication key and its actual payment time. For old subscriptions without a billing snapshot, compare with the linked plan and flag any mismatch for reconciliation. Refresh lifecycle/period information from PayPal; a sale must not resurrect a cancelled subscription.
- Verify the signature before processing a webhook. Only a committed successful processing result is a duplicate to acknowledge. A saved but unsuccessful event remains retryable; side effects and the success marker must commit together.
- Serialize changes to the same order/member in the database, including separate application instances. Membership rights belong to their originating subscription. Repeated activation updates the existing rights; cancellation revokes that subscription's rights and recomputes the member's remaining access from other eligible subscriptions.
- Lifecycle events can arrive late. Compare their ordering information and the authoritative PayPal subscription state before applying a transition. An old activation must not undo a newer cancellation. A cancelled/suspended/expired subscription is removed from active access immediately, preserving the previous application policy. Whether voluntary cancellation should instead preserve prepaid access through period end is a separate product decision.
- Access consumers must check membership status and validity dates as well as the level label. Article reads already do this; testimonial submission now follows the same rule. A stale VIP/SVIP label does not permit access after cancellation or expiry.

The database grouping uses Strapi's transaction context; its document/query operations participate implicitly, while direct Knex operations must use the same transaction explicitly. See [Strapi transaction documentation](https://docs-v5.strapi.io/cms/database-transactions). This API is marked experimental upstream, so retain the integration checks when upgrading Strapi.

## Isolated verification

Use only synthetic fixtures and a disposable local database. Never point a test or a newly built Strapi process at the production database: application startup can synchronize schemas and run bootstrap/cron mutations. No PayPal client secret or live environment is required for deterministic callback tests.

The baseline reproduction must show both observable failures against the pre-change controller: a completed capture leaves a zero `paidAmount`, and a retry of an event that failed processing is acknowledged as a duplicate without recovering membership. Regression tests must then assert the opposite behavior against the changed implementation, rather than merely asserting that a source-code expression changed.

The payment regression suite is `backend/tests/payment-reliability.test.cjs`. The membership access regressions are `backend/src/api/article/controllers/article.test.cjs` and `backend/src/api/testimonial/controllers/testimonial.test.cjs`. Run these from `backend/` using the repository's test command or Node's test runner. Unit/controller fixtures establish business behavior; they do not establish real PayPal signature validation, live settlement, or the concurrency behavior of the production database.

The real database suite, `backend/tests/payment-database.test.cjs`, defaults to a temporary SQLite database. A loopback-only `PAYMENT_TEST_DATABASE_URL` enables the PostgreSQL path, which creates and removes an isolated random schema containing synthetic fixtures. Six database checks passed locally on PostgreSQL 18 Alpine, including actual transactions and SQL uniqueness. This verifies that engine in isolation, not the production server's permissions, schema history or traffic. The GitHub workflow repeats the default backend suite and this PostgreSQL suite, then checks/builds the backend. It also runs frontend tests and generates/checks route types without fetching a production CMS. Its future CI execution is separate from the locally observed results.

Before release, also exercise a disposable database with the production engine/version: apply the schema, race two deliveries of the same event and two different events for the same subscription, inject failure after the first entitlement write, then resend. Confirm that the failed transaction leaves no partial rights and recovery creates one set of rights. Exercise capture completion concurrent with a webhook, duplicate sale IDs under different event IDs, and late renewal snapshots; inspect the actual unique indexes as well as counts. A delayed renewal must not shorten a newer active period.

## Observed verification on 2026-10-23

The isolated checkout started at `main` commit `76a9604c6f31985070e0adac6de87813dc04a002`. Before implementation changes, the two actual-controller regression tests both failed: capture retained `paidAmount=0` instead of `39.95`, and the same failed event did not recover on redelivery. PayPal I/O used synthetic fixtures throughout.

- Backend `npm test`: 81/81 passing, including 26 payment/controller cases, 12 PayPal adapter/preflight cases, 6 real SQLite cases and the existing backend/access suites. `npm run typecheck` and `npm run build` pass.
- The same 6 database cases pass against an isolated PostgreSQL 18 Docker instance with separate connections; each test creates/drops only a random test schema. The temporary container was removed. Set `PAYMENT_TEST_DATABASE_URL` to an explicitly local disposable PostgreSQL URL to run this variant; the harness rejects non-loopback hosts. The real query engine, relation tables, row locks, uniqueness and transaction contexts are exercised; the document-service facade and PayPal I/O are adapted, and production lifecycle/bootstrap effects are not simulated in those database tests.
- Frontend `npm test`: 133/133 passing. `npm run lint`: no errors, two existing hook-dependency warnings in unchanged `MyCoursesPanel.tsx`. Type checking passes.
- Frontend `npm run build` passes with `STRAPI_URL` and `NEXT_PUBLIC_STRAPI_URL` pointing to the isolated local Strapi server. The first default-environment build reached prerendering but failed on a CMS timeout; that is not reported as a passing check. No production CMS was changed.
- An empty local SQLite Strapi application booted successfully with production credentials removed, cron/seeding disabled and synthetic local secrets. The built frontend also started and its Chinese login page opened in the browser.
- Added `.github/workflows/payment-reliability.yml` to repeat backend tests/build, PostgreSQL concurrency checks, frontend tests and types on pull requests without PayPal credentials or deployment actions.

One-time membership orders are now rejected before any capture, because the existing order path has no defined membership-duration fulfillment. Members must use the subscription endpoint. Legacy one-time membership orders require explicit reconciliation; this patch must not charge them and then fail to grant a product. Already-paid course orders use a read-only PayPal order lookup to recover verified local settlement.

## Production reconciliation: read-only phase

Use a read-only database role or read replica and PayPal reporting/GET permissions appropriate to the merchant account. Keep the data and results in the existing restricted financial operations environment. Do not put access tokens, full webhook payloads, customer emails or payer details into tickets, logs or this repository. Record the deployed Git revision, environment, merchant/app identifier, UTC time window, and extraction time. Distinguish sandbox and live records before matching IDs.

Do not use the account-overview HTTP endpoint for a read-only audit: it calls referral reward evaluation and can write data. Use database `SELECT` queries instead. The following examples target PostgreSQL and the repository's snake-case table names; verify the deployed schema and column names first. They are candidate detection queries, not evidence of a bad charge.

```sql
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '15s';

-- Confirm the deployed schema before using the queries below.
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name IN ('orders', 'payment_transactions', 'webhook_events',
                     'membership_subscriptions', 'entitlements', 'lesson_credits')
ORDER BY table_name, ordinal_position;

-- Paid flags without a usable receipt amount, and local expected/actual differences.
-- Discounts, legacy imports and refunds require individual classification.
SELECT id, document_id, order_number, external_order_id,
       order_status, payment_status, currency, unit_price, quantity,
       original_amount, discount_amount, paid_amount, paid_at
FROM orders
WHERE channel = 'paypal'
  AND (payment_status = 'paid' OR order_status IN ('paid', 'completed'))
  AND (paid_amount IS NULL OR paid_amount <= 0
       OR paid_amount <> COALESCE(original_amount, unit_price * quantity)
                         - COALESCE(discount_amount, 0))
ORDER BY id;

-- Do not omit interrupted local flows whose external capture may have completed.
SELECT id, order_number, external_order_id, order_status, payment_status, created_at
FROM orders
WHERE channel = 'paypal' AND external_order_id IS NOT NULL
  AND payment_status IN ('unpaid', 'authorized', 'failed')
ORDER BY created_at;

-- Same external order or capture attached more than once requires investigation.
SELECT external_order_id, COUNT(*) AS row_count
FROM orders
WHERE channel = 'paypal' AND external_order_id IS NOT NULL
GROUP BY external_order_id HAVING COUNT(*) > 1;

SELECT external_transaction_id, action, COUNT(*) AS row_count
FROM payment_transactions
WHERE channel = 'paypal' AND external_transaction_id IS NOT NULL
GROUP BY external_transaction_id, action HAVING COUNT(*) > 1;

-- Preflight the actual SQL unique keys before deploying schema changes.
SELECT external_event_id, COUNT(*) AS row_count
FROM webhook_events WHERE external_event_id IS NOT NULL
GROUP BY external_event_id HAVING COUNT(*) > 1;

SELECT source_key, COUNT(*) AS row_count
FROM lesson_credits WHERE source_key IS NOT NULL
GROUP BY source_key HAVING COUNT(*) > 1;

-- Run this only after confirming idempotency_key exists in the deployed schema.
SELECT idempotency_key, COUNT(*) AS row_count
FROM payment_transactions WHERE idempotency_key IS NOT NULL
GROUP BY idempotency_key HAVING COUNT(*) > 1;

-- Old code also left unsupported/unmatched events unprocessed; classify by type.
SELECT id, external_event_id, event_type, received_at, signature_valid,
       processed, processing_attempts, error_message
FROM webhook_events
WHERE provider = 'paypal' AND processed IS NOT TRUE
ORDER BY received_at;

-- Expired or unbounded active subscriptions need comparison with PayPal.
SELECT id, document_id, subscription_number, external_subscription_id,
       status, auto_renew, current_period_end, next_billing_at, last_paid_at
FROM membership_subscriptions
WHERE channel = 'paypal'
  AND status IN ('active', 'trial')
  AND (current_period_end IS NULL OR current_period_end <= CURRENT_TIMESTAMP)
ORDER BY id;

-- Check actual uniqueness constraints, including legacy deployments.
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = current_schema()
  AND tablename IN ('orders', 'webhook_events', 'payment_transactions',
                    'lesson_credits', 'entitlements');

ROLLBACK;
```

For membership/user/credit relation joins, inspect the deployed Strapi relation tables and foreign keys first; do not assume a relation is a scalar column on the content table. Inspect only the members/orders in the candidate set. Check that each purchase order has at most one `purchase-order-v1:<documentId>` lesson credit, and that its hours agree with the contracted order quantity. Check that every active membership entitlement has the right member, subscription, code and period, and that a cancelled subscription does not leave active rights. Cross-check the user's projected level/status/dates against all their eligible subscriptions, including another active VIP/SVIP subscription and any manual grants. A historical extra credit may already have been reserved or consumed; never delete it automatically.

### Match candidates to PayPal evidence

1. Retrieve the external order through PayPal's [Show order details](https://developer.paypal.com/sdk/orders/v2/orders-get/) endpoint, `GET /v2/checkout/orders/{id}`. Match local order number to the merchant's `custom_id`/`invoice_id`, external order ID, capture ID, completion state, currency, gross amount and payment time. For every capture, consider later refunds, reversals and disputes separately. Fees do not reduce the customer's paid amount. If an old order is no longer available through the API, use the merchant's official transaction/report export; absence of an API result is not evidence of no payment.
2. Read `GET /v1/billing/subscriptions/{id}` and compare the external subscription, merchant plan, custom ID, current status and status-update timestamp to the local subscription. Retrieve the covered payment history with PayPal's [List transactions for subscription](https://www.postman.com/paypal/paypal-public-api-workspace/request/j6nlvbu/list-transactions-for-subscription) request and an explicit UTC start/end time. Follow pagination and provider time-range limits. Do not infer recurring charges from an activation notification or `next_billing_time`.
3. Compare pending local event IDs with the same app's Webhook Events dashboard or read-only Webhooks Management event endpoints. Separate signature/configuration problems, unmatched subscriptions, unsupported event types, transient processing errors, stale events and actual recoverable failures. Preserve both local and provider timestamps. A missing local event and a saved failed event are different conditions.
4. Produce a restricted reconciliation sheet with only required identifiers: local order/subscription ID, external order/subscription/capture/event ID, local status/amount/currency/time, authoritative status/amount/currency/time, classification and proposed remedy. Use categories such as confirmed consistent, needs provider evidence, verified local amount mismatch, failed event needing replay, duplicate rights and unsupported event. The candidate SQL alone must not label any record as financial loss.

## Recovery after separate release approval

The read-only phase above makes no changes. Deployment, notification resend and historical repair require a separately reviewed operational change; they were not performed by this patch.

After the fix is released and its schema verified, resend a single verified failed event from the **matching PayPal app's** Webhook Events dashboard. The listener must reverify the delivery, attempt the unprocessed event, commit its business state and success marker, and then acknowledge it. Check attempts/errors and final rights; resend the same event again and verify no additional transaction or entitlement. Only then increase replay volume with monitoring. PayPal documents retries for non-2xx responses and manual dashboard resend after automatic delivery is exhausted in its [Webhook guide](https://developer.paypal.com/api/webhooks/overview/). Already acknowledged old failures will generally need this explicit replay; the patch cannot make PayPal redeliver historical events by itself.

Never force `processed=true`, delete deduplication records, bypass signature checks, or POST invented live events. Never change a zero paid amount to the catalog price without a matching provider receipt. Prepare any historical amount repair as a separate reviewed migration with immutable evidence, before/after values, one-record preconditions, an audit trail and a rollback plan. Resolve duplicate/used credits and financial disputes individually.

Monitor failed/unprocessed supported events, repeated attempts, amount/currency mismatches, lock timeouts, PayPal timeouts, and unusual counts of grants per order/subscription. Diagnose persistent failures before replaying repeatedly. Alerts should avoid payloads and secrets.

## Remaining scope and release risks

- Local deterministic tests are not live PayPal acceptance tests. Credentials, merchant ownership, webhook registration, app/environment pairing, HTTPS delivery and provider API permissions still need a real sandbox end-to-end check. No real production payment data was inspected.
- `PAYMENT.SALE.COMPLETED` is supported for the configured fixed-price subscription amount/currency. Setup fees, taxes, discounts, proration, variable-price plans and provider-side price changes can legitimately differ from that amount and will require reconciliation rather than automatic acceptance. Refund/reversal/dispute accounting and their effects on lesson credits/referral rewards remain follow-up work. Unsupported events must not be interpreted as successful charges or newly paid membership periods.
- Existing historical zero amounts, stale entitlements and already acknowledged failed events are not automatically repaired. Manual/admin-grant memberships and other payment channels need careful reconciliation alongside PayPal subscriptions.
- The patch explicitly requests SQL uniqueness for webhook event IDs, payment idempotency keys and lesson-credit source keys. Strapi's application-level `unique` validation alone did not provide these indexes in the tested database. Inspect duplicate keys with the read-only preflight queries above and rehearse schema synchronization on a restored disposable snapshot before release: existing event/credit duplicates can prevent index creation and must not be blindly deleted. Verify the actual indexes and locking with the deployment's database engine and concurrent instances. Keep a backup and inspect schema changes during review.
- Provider lookups can fail or time out; a lifecycle event must fail retryably rather than creating indefinite access. Snapshots are fetched outside database locks and rechecked under the member/subscription locks. Continue monitoring snapshot freshness, contention and the configured connection pool.
- Request-time access checks reject expired membership, but absence of an expiry/reconciliation worker can leave account labels or stored entitlement rows stale until another lifecycle update. Scheduled reconciliation and operational alert routing are not created by this change.
- Cancellation currently removes active rights immediately. Preserving already-paid benefits until period end requires a defined policy plus separate tests for trial, cancellation, suspension, refunds and multiple subscriptions. Do not infer that policy from payment timestamps alone.
