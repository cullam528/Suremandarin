import { grantLessonCredit, grantUnifiedTrialLesson } from '../../lesson-credit/services/grant';

const REFERRAL_REWARD_SOURCE = 'referral-reward-v1';
const REFUND_WINDOW_DAYS = Math.max(0, Number(process.env.REFERRAL_REFUND_WINDOW_DAYS ?? 7));

function addDays(value: string | Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export async function grantReferralTrialLesson(strapi: any, userId: number) {
  return grantUnifiedTrialLesson(strapi, {
    userId,
    source: 'referral',
    notes: 'Free trial lesson for registering through a SureMandarin referral link.',
  });
}

export async function markReferralPayment(strapi: any, order: any) {
  if (!order?.id) return;
  const referrals = await strapi.db.query('api::referral.referral').findMany({
    where: { order: order.id },
    limit: 1,
  });
  const referral = referrals[0];
  if (!referral) return;
  const paidAt = order.paidAt ? new Date(order.paidAt) : new Date();
  const refundWindowEndsAt = addDays(paidAt, REFUND_WINDOW_DAYS);
  await strapi.db.query('api::referral.referral').update({
    where: { id: referral.id },
    data: { refundWindowEndsAt },
  });
  await evaluateReferralRewards(strapi, referral.referrer?.id ?? referral.referrer);
}

function isPaidOrder(order: any) {
  if (!order) return false;
  const status = String(order.orderStatus ?? '').toLowerCase();
  const paymentStatus = String(order.paymentStatus ?? '').toLowerCase();
  if (!['paid', 'completed'].includes(status)) return false;
  return !['refunded', 'partially-refunded', 'failed'].includes(paymentStatus);
}

export async function evaluateReferralRewards(strapi: any, referrerId?: number) {
  if (!referrerId) return { qualified: 0, batches: 0 };
  const referrals = await strapi.db.query('api::referral.referral').findMany({
    where: { referrer: referrerId },
    populate: { order: true },
    orderBy: { createdAt: 'asc' },
  });
  const now = new Date();
  const qualified: any[] = [];

  for (const referral of referrals) {
    if (referral.rewardStatus === 'rejected' || !isPaidOrder(referral.order)) continue;
    const refundWindowEndsAt = referral.refundWindowEndsAt
      ? new Date(referral.refundWindowEndsAt)
      : referral.order?.paidAt
        ? addDays(referral.order.paidAt, REFUND_WINDOW_DAYS)
        : null;
    if (!refundWindowEndsAt || refundWindowEndsAt > now) continue;
    qualified.push(referral);
    if (!referral.qualifiedAt || !referral.refundWindowEndsAt) {
      await strapi.db.query('api::referral.referral').update({
        where: { id: referral.id },
        data: { qualifiedAt: referral.qualifiedAt ?? now, refundWindowEndsAt },
      });
    }
  }

  const batches = Math.floor(qualified.length / 3);
  for (let index = 0; index < batches; index += 1) {
    const batchNumber = index + 1;
    const sourceKey = `${REFERRAL_REWARD_SOURCE}:${referrerId}:batch:${batchNumber}`;
    await grantLessonCredit(strapi, {
      userId: referrerId,
      hours: 2,
      source: 'referral',
      sourceKey,
      status: 'pending-review',
      notes: `Referral reward batch ${batchNumber}: three paid referrals passed the refund window.`,
    });

    const anchor = qualified[index * 3];
    if (!anchor.rewardBatchKey) {
      await strapi.db.query('api::referral.referral').update({
        where: { id: anchor.id },
        data: {
          rewardBatchKey: sourceKey,
          rewardHours: 2,
          rewardStatus: 'pending',
          notes: `Three qualified referrals reached. Reward awaits Super Admin or Editor approval.`,
        },
      });
    }
  }
  return { qualified: qualified.length, batches };
}

export async function evaluateAllReferralRewards(strapi: any) {
  const referrals = await strapi.db.query('api::referral.referral').findMany({
    populate: { referrer: true },
    fields: ['id'],
  });
  const referrerIds = Array.from(new Set(referrals.map((item: any) => item.referrer?.id ?? item.referrer).filter(Boolean)));
  for (const referrerId of referrerIds) await evaluateReferralRewards(strapi, Number(referrerId));
}
