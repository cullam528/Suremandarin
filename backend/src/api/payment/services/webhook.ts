import { amountMinorUnits, settlePayPalOrder } from './settlement';
import { lockEntityRow } from './payment-lock';

const EVENT = 'api::webhook-event.webhook-event';
const SUB = 'api::membership-subscription.membership-subscription';
const USER = 'plugin::users-permissions.user';
const ENTITLEMENT = 'api::entitlement.entitlement';
const TRANSACTION = 'api::payment-transaction.payment-transaction';
const lifecycleEvents = new Set([
  'BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CANCELLED',
  'BILLING.SUBSCRIPTION.EXPIRED', 'BILLING.SUBSCRIPTION.SUSPENDED',
  'BILLING.SUBSCRIPTION.UPDATED', 'PAYMENT.SALE.COMPLETED',
]);
const codes = (level: string) => level === 'svip'
  ? ['article.vip.read', 'article.svip.read', 'course.basic.access', 'course.premium.access', 'video.download', 'support.priority']
  : ['article.vip.read', 'course.basic.access', 'video.download'];
const timestamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? Date.parse(value) : NaN;
const cents = (value: unknown) => {
  const amount = amountMinorUnits(value);
  if (amount <= 0) throw new Error('Invalid PayPal sale amount');
  return amount;
};

async function projectMembership(strapi: any, userId: number, fallbackStatus: string) {
  const subscriptions = await strapi.db.query(SUB).findMany({ where: { user: userId }, populate: ['plan'] });
  const now = Date.now();
  const active = subscriptions.filter((sub: any) =>
    ['active', 'trial'].includes(sub.status) && ['vip', 'svip'].includes(sub.plan?.code)
    && Number.isFinite(timestamp(sub.currentPeriodEnd)) && timestamp(sub.currentPeriodEnd) > now
    && (!sub.startedAt || timestamp(sub.startedAt) <= now));
  active.sort((a: any, b: any) => (b.plan.code === 'svip' ? 2 : 1) - (a.plan.code === 'svip' ? 2 : 1)
    || timestamp(b.currentPeriodEnd) - timestamp(a.currentPeriodEnd));
  const selected = active[0];
  const user = await strapi.db.query(USER).findOne({ where: { id: userId } });
  // A PayPal callback cannot revoke a manual/other-channel grant with no subscription record.
  if (user?.membershipChannel && !['paypal', 'none'].includes(user.membershipChannel)
    && ['active', 'trial'].includes(user.membershipStatus)
    && (!user.membershipStartedAt || timestamp(user.membershipStartedAt) <= now)
    && (!user.membershipExpiresAt || timestamp(user.membershipExpiresAt) > now)
    && (!selected || (user.membershipLevel === 'svip' ? 2 : 1) >= (selected.plan.code === 'svip' ? 2 : 1))) return;
  await strapi.db.query(USER).update({ where: { id: userId }, data: selected ? {
    membershipLevel: selected.plan.code, membershipStatus: selected.status,
    membershipStartedAt: selected.startedAt, membershipExpiresAt: selected.currentPeriodEnd,
    membershipChannel: selected.channel, currentPlan: selected.plan.id, autoRenew: selected.autoRenew,
  } : {
    membershipLevel: 'registered', membershipStatus: fallbackStatus,
    membershipExpiresAt: new Date().toISOString(), autoRenew: false, currentPlan: null,
  } });
}

async function applySubscription(strapi: any, trx: any, event: any, snapshot: any) {
  const externalId = event.event_type === 'PAYMENT.SALE.COMPLETED'
    ? event.resource?.billing_agreement_id : event.resource?.id;
  if (!externalId || snapshot?.id !== externalId) throw new Error('Subscription identity mismatch');
  const records = await strapi.db.query(SUB).findMany({ where: { externalSubscriptionId: externalId, channel: 'paypal' }, populate: ['user', 'plan'], limit: 2 });
  if (records.length !== 1) throw new Error('PayPal subscription is not uniquely linked yet');
  // Lock the user first so separate subscription callbacks cannot race its projection.
  const userId = records[0].user?.id;
  if (!userId) throw new Error('Subscription user is unavailable');
  await lockEntityRow(strapi, trx, USER, userId);
  await lockEntityRow(strapi, trx, SUB, records[0].id);
  const sub = await strapi.db.query(SUB).findOne({ where: { id: records[0].id }, populate: ['user', 'plan'] });
  if (!sub?.plan || !['vip', 'svip'].includes(sub.plan.code)) throw new Error('Subscription plan is unavailable');
  if (snapshot.custom_id !== sub.documentId || (event.resource?.custom_id && event.resource.custom_id !== sub.documentId)) {
    throw new Error('Subscription custom ID mismatch');
  }
  const allowedPlanIds = sub.externalPlanId ? [sub.externalPlanId] : [sub.plan.paypalMonthlyPlanId, sub.plan.paypalYearlyPlanId].filter(Boolean);
  if (!allowedPlanIds.includes(snapshot.plan_id)) throw new Error('Subscription plan mismatch');
  const stateAt = timestamp(snapshot.status_update_time);
  if (!Number.isFinite(stateAt)) throw new Error('Subscription status timestamp is unavailable');
  const eventStateAt = timestamp(event.resource?.status_update_time);
  if (Number.isFinite(eventStateAt) && stateAt < eventStateAt) throw new Error('PayPal subscription snapshot is not current yet');
  const statuses: Record<string, string> = { ACTIVE: 'active', CANCELLED: 'cancelled', EXPIRED: 'expired', SUSPENDED: 'suspended' };
  const status = statuses[snapshot.status];
  if (!status) throw new Error('PayPal subscription is not in a supported state yet');

  if (event.event_type === 'PAYMENT.SALE.COMPLETED') {
    const sale = event.resource;
    if (!sale?.id || String(sale.state).toLowerCase() !== 'completed') throw new Error('Sale is not completed');
    const expectedAmount = sub.billingAmount ?? (snapshot.plan_id === sub.plan.paypalYearlyPlanId ? sub.plan.yearlyPrice : sub.plan.monthlyPrice);
    const currency = sub.billingCurrency ?? sub.plan.currency;
    if (sale.amount?.currency !== currency || cents(sale.amount?.total) !== cents(expectedAmount)) throw new Error('Subscription sale amount or currency mismatch');
    const paidTime = timestamp(sale.create_time);
    if (!Number.isFinite(paidTime)) throw new Error('Sale payment timestamp is unavailable');
    const key = `paypal:sale:${sale.id}`;
    const recorded = await strapi.db.query(TRANSACTION).findOne({ where: { idempotencyKey: key }, populate: ['subscription'] });
    if (recorded && (recorded.subscription?.id !== sub.id || recorded.status !== 'succeeded'
      || recorded.action !== 'sale' || recorded.currency !== currency
      || cents(recorded.settledAmount) !== cents(sale.amount.total))) {
      throw new Error('Sale was recorded inconsistently; reconciliation is required');
    }
    if (!recorded) await strapi.documents(TRANSACTION).create({ data: {
      transactionNumber: `PP-SALE-${sale.id}`, idempotencyKey: key, subscription: sub.documentId,
      user: userId, channel: 'paypal', action: 'sale', externalTransactionId: sale.id,
      requestedAmount: expectedAmount, settledAmount: cents(sale.amount.total) / 100,
      currency, status: 'succeeded', completedAt: new Date(paidTime).toISOString(),
    } });
    if (!sub.lastPaidAt || paidTime > timestamp(sub.lastPaidAt)) {
      await strapi.db.query(SUB).update({ where: { id: sub.id }, data: { lastPaidAt: new Date(paidTime).toISOString() } });
    }
    if (!sub.user.lastPaymentAt || paidTime > timestamp(sub.user.lastPaymentAt)) {
      await strapi.db.query(USER).update({ where: { id: userId }, data: { lastPaymentAt: new Date(paidTime).toISOString() } });
    }
  }

  const lastStateAt = timestamp(sub.lastPaypalEventAt);
  // Do not let delayed delivery resurrect cancelled/expired subscriptions. A new
  // subscription must have its own PayPal ID; suspension can be explicitly lifted.
  if ((Number.isFinite(lastStateAt) && stateAt < lastStateAt)
    || (['cancelled', 'expired'].includes(sub.status) && status === 'active')
    || (stateAt === lastStateAt && sub.status !== 'active' && status === 'active')) return;
  let expiresAt = snapshot.billing_info?.next_billing_time;
  // Renewal snapshots may share status_update_time while next_billing_time
  // advances. A slower concurrent fetch must not shorten the current period.
  if (status === 'active' && sub.status === 'active' && timestamp(sub.currentPeriodEnd) > timestamp(expiresAt)) {
    expiresAt = sub.currentPeriodEnd;
  }
  if (status === 'active' && !(timestamp(expiresAt) > Date.now())) {
    throw new Error('Active subscription has no future billing boundary');
  }
  const startedAt = snapshot.start_time ?? sub.startedAt;
  if (status === 'active' && (!Number.isFinite(timestamp(startedAt)) || timestamp(startedAt) > Date.now())) {
    throw new Error('Subscription has not started');
  }
  await strapi.db.query(SUB).update({ where: { id: sub.id }, data: {
    status, autoRenew: status === 'active',
    lastPaypalEventAt: new Date(stateAt).toISOString(), lastPaypalEventId: event.id, lastPaypalEventType: event.event_type,
    ...(status === 'active' ? { startedAt, currentPeriodEnd: expiresAt, nextBillingAt: expiresAt, cancelledAt: null }
      : { cancelledAt: new Date(stateAt).toISOString(), nextBillingAt: null }),
  } });
  const entitlements = await strapi.db.query(ENTITLEMENT).findMany({ where: { user: userId, subscription: sub.id, source: 'membership' } });
  const validCodes = codes(sub.plan.code);
  for (const entitlement of entitlements) {
    const active = status === 'active' && validCodes.includes(entitlement.code);
    await strapi.db.query(ENTITLEMENT).update({ where: { id: entitlement.id }, data: {
      status: active ? 'active' : 'revoked', ...(active ? { expiresAt } : {}),
    } });
  }
  if (status === 'active') for (const code of validCodes) {
    if (!entitlements.some((entitlement: any) => entitlement.code === code)) {
      await strapi.documents(ENTITLEMENT).create({ data: {
        user: userId, subscription: sub.documentId, code, name: code, source: 'membership',
        startsAt: startedAt, expiresAt, status: 'active', usedCount: 0,
        platforms: ['web', 'miniprogram', 'ios', 'android'],
      } });
    }
  }
  await projectMembership(strapi, userId, status);
}

export async function processPayPalWebhook(strapi: any, event: any) {
  let log = await strapi.db.query(EVENT).findOne({ where: { externalEventId: event.id } });
  if (!log) {
    try {
      log = await strapi.documents(EVENT).create({ data: {
        provider: 'paypal', externalEventId: event.id, eventType: event.event_type,
        receivedAt: new Date().toISOString(), signatureValid: true, processed: false,
        processingAttempts: 0, payload: event,
      } });
    } catch (error) {
      // Unique externalEventId arbitrates concurrent first deliveries. Recover
      // outside the failed transaction (PostgreSQL aborts it on a constraint error).
      log = await strapi.db.query(EVENT).findOne({ where: { externalEventId: event.id } });
      if (!log) throw error;
    }
  }
  if (log.provider !== 'paypal' || log.eventType !== event.event_type) throw new Error('Webhook event identity collision');
  // Attempts persist even when business work rolls back or the worker exits.
  const duplicate = await strapi.db.transaction(async ({ trx }: any) => {
    await lockEntityRow(strapi, trx, EVENT, log.id);
    const current = await strapi.db.query(EVENT).findOne({ where: { id: log.id } });
    if (current.processed) return true;
    await strapi.db.query(EVENT).update({ where: { id: log.id }, data: { processingAttempts: Number(current.processingAttempts ?? 0) + 1 } });
    return false;
  });
  if (duplicate) return { received: true, processed: true, duplicate: true };

  try {
    const paypal = strapi.service('api::payment.paypal');
    // Remote requests stay outside database locks. The status timestamp is
    // checked again under the subscription lock before applying any snapshot.
    let snapshot: any;
    if (lifecycleEvents.has(event.event_type)) {
      const id = event.event_type === 'PAYMENT.SALE.COMPLETED' ? event.resource?.billing_agreement_id : event.resource?.id;
      if (!id) throw new Error('Missing subscription ID');
      snapshot = await paypal.getSubscription(id);
    } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const orderId = event.resource?.supplementary_data?.related_ids?.order_id;
      if (!orderId) throw new Error('Missing capture order ID');
      snapshot = await paypal.getOrder(orderId);
      const captures = snapshot.purchase_units?.flatMap((unit: any) => unit.payments?.captures ?? []) ?? [];
      if (!captures.some((capture: any) => capture.id === event.resource?.id)) throw new Error('Capture does not belong to order');
      if (snapshot.status !== 'COMPLETED') throw new Error('Captured order is not completed yet');
    }
    return await strapi.db.transaction(async ({ trx }: any) => {
      await lockEntityRow(strapi, trx, EVENT, log.id);
      const current = await strapi.db.query(EVENT).findOne({ where: { id: log.id } });
      if (current.processed) return { received: true, processed: true, duplicate: true };
      let ignored = false;
      if (lifecycleEvents.has(event.event_type)) await applySubscription(strapi, trx, event, snapshot);
      else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const settlement = await settlePayPalOrder(strapi, { paypalOrderId: snapshot.id, result: snapshot });
        if (settlement.processing) throw new Error('Capture is not ready for settlement');
      } else ignored = true;
      await strapi.db.query(EVENT).update({ where: { id: log.id }, data: { processed: true, errorMessage: null } });
      return { received: true, processed: true, ...(ignored ? { ignored: true } : {}) };
    });
  } catch (error) {
    await strapi.db.transaction(async ({ trx }: any) => {
      await lockEntityRow(strapi, trx, EVENT, log.id);
      const current = await strapi.db.query(EVENT).findOne({ where: { id: log.id } });
      if (!current.processed) await strapi.db.query(EVENT).update({ where: { id: log.id }, data: {
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : 'Unknown PayPal processing failure',
      } });
    });
    throw error;
  }
}
