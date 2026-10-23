import { grantLessonCredit } from '../../lesson-credit/services/grant';
import { markReferralPayment } from '../../referral/services/referral-rewards';
import { lockEntityRow } from './payment-lock';

const ORDER_UID = 'api::order.order';
const TRANSACTION_UID = 'api::payment-transaction.payment-transaction';
const SUPPORTED_CURRENCIES = new Set(['USD', 'CNY', 'EUR', 'GBP']);

/** All currencies supported by the order schema have two fractional digits. */
export function amountMinorUnits(value: unknown): number {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(?:\.\d{1,2}0*)?$/.test(String(value))) {
    throw new Error('Invalid payment amount');
  }
  const [whole, fraction = ''] = String(value).split('.');
  const minor = Number(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);
  if (!Number.isSafeInteger(minor)) throw new Error('Payment amount exceeds supported precision');
  return minor;
}

export function expectedOrderAmount(order: any): number {
  const quantity = Number(order.quantity ?? 1);
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Invalid order quantity');
  const subtotal = amountMinorUnits(order.unitPrice) * quantity;
  if (!Number.isSafeInteger(subtotal)) throw new Error('Invalid order subtotal');
  const original = order.originalAmount == null ? subtotal : amountMinorUnits(order.originalAmount);
  if (original !== subtotal) throw new Error('Order subtotal does not match the price snapshot');
  const expected = original - amountMinorUnits(order.discountAmount ?? 0);
  if (expected <= 0) throw new Error('Invalid order payable amount');
  return expected;
}

export type VerifiedCapture = {
  id: string;
  amount: string;
  minorUnits: number;
  currency: string;
  paidAt: string;
};

/** Accept an authenticated Orders API response, never a client-provided amount. */
export function validatePayPalCapture(order: any, result: any): VerifiedCapture | null {
  if (order.channel !== 'paypal' || result?.id !== order.externalOrderId) {
    throw new Error('PayPal order identity does not match');
  }
  if (!SUPPORTED_CURRENCIES.has(order.currency)) throw new Error('Unsupported payment currency');
  if (!Array.isArray(result.purchase_units) || result.purchase_units.length !== 1) {
    throw new Error('Expected one PayPal purchase unit');
  }
  const unit = result.purchase_units[0];
  if (unit.reference_id !== order.orderNumber || (unit.custom_id != null && unit.custom_id !== order.orderNumber)) {
    throw new Error('PayPal purchase unit does not match the local order');
  }
  const expected = expectedOrderAmount(order);
  if (unit.amount && (unit.amount.currency_code !== order.currency || amountMinorUnits(unit.amount.value) !== expected)) {
    throw new Error('PayPal purchase unit amount or currency does not match');
  }
  if (result.status !== 'COMPLETED') return null;
  const captures = unit.payments?.captures;
  if (!Array.isArray(captures) || captures.length !== 1) {
    throw new Error('Expected one PayPal capture');
  }
  const capture = captures[0];
  if (capture.status === 'PENDING') return null;
  if (capture.status !== 'COMPLETED' || capture.final_capture === false || typeof capture.id !== 'string' || !/^[A-Za-z0-9_-]{1,127}$/.test(capture.id)) {
    throw new Error('PayPal capture is not a completed final payment');
  }
  const captured = amountMinorUnits(capture.amount?.value);
  if (captured !== expected || capture.amount?.currency_code !== order.currency) {
    throw new Error('PayPal capture amount or currency does not match the order');
  }
  const timestamp = capture.create_time ?? capture.update_time;
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error('PayPal capture timestamp is missing or invalid');
  }
  return {
    id: capture.id,
    amount: `${Math.floor(captured / 100)}.${String(captured % 100).padStart(2, '0')}`,
    minorUnits: captured,
    currency: order.currency,
    paidAt: new Date(timestamp).toISOString(),
  };
}

/**
 * Payment fact, order state, and fulfillment commit together. The order row lock
 * serializes browser retries and webhook delivery across application processes;
 * the unique provider key also prevents the same capture paying another order.
 */
export async function settlePayPalOrder(strapi: any, input: {
  paypalOrderId: string;
  userId?: number;
  result: any;
}) {
  return strapi.db.transaction(async ({ trx }: { trx: any }) => {
    const where = {
      externalOrderId: input.paypalOrderId,
      channel: 'paypal',
      ...(input.userId == null ? {} : { user: input.userId }),
    };
    const matches = await strapi.db.query(ORDER_UID).findMany({ where, limit: 2 });
    if (matches.length !== 1) throw new Error('PayPal order is missing or ambiguous');
    await lockEntityRow(strapi, trx, ORDER_UID, matches[0].id);
    const order = await strapi.db.query(ORDER_UID).findOne({ where: { id: matches[0].id }, populate: { user: true } });
    if (!order?.user?.id || (input.userId != null && order.user.id !== input.userId)) {
      throw new Error('PayPal order owner does not match');
    }
    const capture = validatePayPalCapture(order, input.result);
    if (!capture) return { orderNumber: order.orderNumber, paypalStatus: input.result.status, processing: true, duplicate: false };
    // Lesson-credit lifecycle hooks recompute the member's balance. Serialize
    // separate purchases for the same member as well as retries of one order.
    await lockEntityRow(strapi, trx, 'plugin::users-permissions.user', order.user.id);
    if (!['pending', 'awaiting-payment', 'paid', 'completed'].includes(order.orderStatus)
      || !['unpaid', 'authorized', 'paid'].includes(order.paymentStatus)) {
      throw new Error('Order requires reconciliation before settlement');
    }
    if (order.productType !== 'course') {
      throw new Error('This order type requires manual reconciliation; memberships use subscriptions');
    }
    if (order.paidAmount != null && amountMinorUnits(order.paidAmount) !== 0 && amountMinorUnits(order.paidAmount) !== capture.minorUnits) {
      throw new Error('Recorded payment amount conflicts with the verified capture');
    }
    const idempotencyKey = `paypal:capture:${capture.id}`;
    const existing = await strapi.db.query(TRANSACTION_UID).findOne({ where: { idempotencyKey }, populate: { order: true } });
    if (existing) {
      if (existing.order?.id !== order.id || existing.status !== 'succeeded'
        || existing.currency !== capture.currency || amountMinorUnits(existing.settledAmount) !== capture.minorUnits
        || order.paymentStatus !== 'paid' || amountMinorUnits(order.paidAmount) !== capture.minorUnits) {
        throw new Error('Capture was recorded inconsistently; reconciliation is required');
      }
      return { orderNumber: order.orderNumber, paypalStatus: 'COMPLETED', processing: false, duplicate: true };
    }
    await strapi.documents(TRANSACTION_UID).create({ data: {
      transactionNumber: `PP-CAP-${capture.id}`,
      idempotencyKey,
      order: order.documentId,
      user: order.user.id,
      channel: 'paypal',
      action: 'capture',
      externalTransactionId: capture.id,
      requestedAmount: capture.amount,
      settledAmount: capture.amount,
      currency: capture.currency,
      status: 'succeeded',
      completedAt: capture.paidAt,
      responseSummary: { orderId: input.paypalOrderId, captureId: capture.id, status: 'COMPLETED' },
    } });
    // Existing zero-valued records are repaired only from a verified capture.
    const paidAt = order.paidAt ?? capture.paidAt;
    await strapi.db.query(ORDER_UID).update({ where: { id: order.id }, data: {
      orderStatus: order.orderStatus === 'completed' ? 'completed' : 'paid',
      paymentStatus: 'paid',
      paidAmount: capture.amount,
      paidAt,
    } });
    const purchasedHours = Number(order.lessonHours ?? 0) * Number(order.quantity ?? 1);
    if (!Number.isFinite(purchasedHours) || purchasedHours < 0) throw new Error('Invalid purchased lesson hours');
    if (purchasedHours > 0) {
      await grantLessonCredit(strapi, {
        userId: order.user.id,
        hours: purchasedHours,
        source: 'purchase',
        sourceKey: `purchase-order-v1:${order.documentId ?? order.id}`,
        status: 'available',
        notes: `Purchased lesson hours from order ${order.orderNumber}.`,
      });
    }
    await markReferralPayment(strapi, { ...order, paidAt, orderStatus: 'paid', paymentStatus: 'paid' });
    return { orderNumber: order.orderNumber, paypalStatus: 'COMPLETED', processing: false, duplicate: false };
  });
}
