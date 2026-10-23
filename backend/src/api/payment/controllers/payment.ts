import { evaluateReferralRewards } from '../../referral/services/referral-rewards';
import { expectedOrderAmount, settlePayPalOrder } from '../services/settlement';
import { processPayPalWebhook } from '../services/webhook';

const money = (value: unknown) => Number(value ?? 0).toFixed(2);
const orderNumber = () => `SM-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const subscriptionNumber = () => `SUB-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

async function attachReferralToOrder(userId: number, orderId: number, courseId?: number | string) {
  try {
    const referrals = await strapi.db.query('api::referral.referral').findMany({
      where: { referredUser: userId, order: null },
      limit: 1,
    });
    const referral = referrals[0];
    if (!referral) return;
    await strapi.db.query('api::referral.referral').update({
      where: { id: referral.id },
      data: {
        order: orderId,
        ...(courseId ? { course: courseId } : {}),
      },
    });
  } catch (error) {
    strapi.log.warn(`Unable to attach referral to order: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export default {
  async accountOverview(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    await evaluateReferralRewards(strapi, user.id);
    const [subscriptions, orders, enrollments, progress, lessonCredits, lessonBookings] = await Promise.all([
      strapi.db.query('api::membership-subscription.membership-subscription').findMany({ where: { user: user.id }, populate: { plan: true }, orderBy: { createdAt: 'desc' } }),
      strapi.db.query('api::order.order').findMany({ where: { user: user.id }, populate: { membershipPlan: true, course: true }, orderBy: { createdAt: 'desc' } }),
      strapi.db.query('api::enrollment.enrollment').findMany({ where: { user: user.id }, populate: { course: true }, orderBy: { enrolledAt: 'desc' } }),
      strapi.db.query('api::learning-progress.learning-progress').findMany({ where: { user: user.id }, populate: { course: true, module: true, lesson: true }, orderBy: { lastStudiedAt: 'desc' } }),
      strapi.db.query('api::lesson-credit.lesson-credit').findMany({ where: { user: user.id }, orderBy: { grantedAt: 'desc' } }),
      strapi.db.query('api::lesson-booking.lesson-booking').findMany({ where: { user: user.id }, populate: { course: true, teacherUser: true, reservedCredit: true }, orderBy: { requestedStartAt: 'desc' } }),
    ]);
    let referrals: any[] = [];
    try {
      referrals = await strapi.db.query('api::referral.referral').findMany({
        where: { referrer: user.id },
        populate: { referrer: true, referredUser: true, course: true, order: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      strapi.log.warn(`Referral records are not available yet: ${error instanceof Error ? error.message : String(error)}`);
    }
    const referralStats = {
      invitedCount: referrals.length,
      registeredCount: referrals.filter((item: any) => item.referredUser).length,
      enrolledCount: referrals.filter((item: any) => item.enrolledAt || ['paid', 'completed'].includes(item.order?.orderStatus)).length,
      pendingRewardHours: referrals
        .filter((item: any) => ['pending', 'approved'].includes(item.rewardStatus))
        .reduce((sum: number, item: any) => sum + Number(item.rewardHours ?? 0), 0),
      earnedRewardHours: referrals
        .filter((item: any) => item.rewardStatus === 'paid')
        .reduce((sum: number, item: any) => sum + Number(item.rewardHours ?? 0), 0),
    };
    ctx.body = {
      subscriptions: subscriptions.map((item: any) => ({ subscriptionNumber: item.subscriptionNumber, status: item.status, channel: item.channel, autoRenew: item.autoRenew, currentPeriodEnd: item.currentPeriodEnd, plan: item.plan ? { name: item.plan.name, code: item.plan.code } : null })),
      orders: orders.map((item: any) => ({ orderNumber: item.orderNumber, productType: item.productType, productName: item.productNameSnapshot, paidAmount: item.channel === 'paypal' && ['paid', 'completed'].includes(item.orderStatus) && !(Number(item.paidAmount) > 0) ? null : item.paidAmount ?? null, currency: item.currency, orderStatus: item.orderStatus, paymentStatus: item.paymentStatus, paidAt: item.paidAt, createdAt: item.createdAt, lessonHours: Number(item.lessonHours ?? 0) })),
      enrollments: enrollments.map((item: any) => ({ status: item.status, source: item.source, enrolledAt: item.enrolledAt, expiresAt: item.expiresAt, course: item.course ? { title: item.course.title, slug: item.course.slug, summary: item.course.summary } : null })),
      progress: progress.map((item: any) => ({ progressPercent: Number(item.progressPercent ?? 0), completed: Boolean(item.completed), lastStudiedAt: item.lastStudiedAt, course: item.course ? { title: item.course.title, slug: item.course.slug } : null, module: item.module ? { title: item.module.title } : null, lesson: item.lesson ? { title: item.lesson.title } : null })),
      lessonCredits: {
        availableHours: lessonCredits
          .filter((item: any) => item.status === 'available')
          .reduce((sum: number, item: any) => sum + Number(item.hours ?? 0), 0),
        reservedHours: lessonCredits
          .filter((item: any) => item.status === 'reserved')
          .reduce((sum: number, item: any) => sum + Number(item.hours ?? 0), 0),
        bySource: ['referral', 'daily-challenge', 'purchase', 'manual'].reduce((result: Record<string, number>, source) => {
          result[source] = lessonCredits
            .filter((item: any) => item.status === 'available' && item.source === source)
            .reduce((sum: number, item: any) => sum + Number(item.hours ?? 0), 0);
          return result;
        }, {}),
        credits: lessonCredits.map((item: any) => ({ hours: Number(item.hours ?? 0), source: item.source, status: item.status, grantedAt: item.grantedAt })),
      },
      lessonBookings: lessonBookings.map((item: any) => ({
        id: item.id,
        status: item.status,
        requestedStartAt: item.requestedStartAt,
        requestedEndAt: item.requestedEndAt,
        timezone: item.timezone,
        teacherUserId: item.teacherUser?.id ?? item.teacherUser ?? null,
        teacherName: item.teacherName ?? item.teacherUser?.fullName ?? item.teacherUser?.username ?? null,
        notes: item.notes ?? '',
        confirmedAt: item.confirmedAt,
        completedAt: item.completedAt,
        cancelledAt: item.cancelledAt,
        course: item.course ? { title: item.course.title, slug: item.course.slug, summary: item.course.summary } : null,
      })),
      referralStats,
      referrals: referrals.map((item: any) => ({
        sourceChannel: item.sourceChannel ?? 'website',
        referrerName: item.referrer?.fullName ?? item.referrer?.username ?? user.fullName ?? user.username,
        referredName: item.referredUser?.fullName ?? item.referredUser?.username,
        referredEmail: item.referredUser?.email,
        courseName: item.course?.title ?? item.course?.name,
        orderNumber: item.order?.orderNumber,
        rewardStatus: item.rewardStatus ?? 'pending',
        rewardHours: Number(item.rewardHours ?? 0),
      })),
    };
  },
  async createPayPalOrder(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const { productType, courseDocumentId, platform = 'web' } = ctx.request.body as Record<string, string>;
    let product: any;
    let amount = 0;
    let currency = 'USD';
    if (productType === 'membership') return ctx.badRequest('Use PayPal subscriptions for membership purchases');
    if (productType === 'course' && courseDocumentId) {
      product = await strapi.documents('api::course.course').findOne({ documentId: courseDocumentId, status: 'published' });
      if (!product?.enabled || !product.allowStandalonePurchase) return ctx.badRequest('Course is unavailable for purchase');
      amount = Number(product.standalonePrice);
      currency = product.currency;
    } else return ctx.badRequest('Invalid product');
    if (!Number.isFinite(amount) || !(amount > 0)) return ctx.badRequest('Product price is invalid');

    const number = orderNumber();
    const order = await strapi.documents('api::order.order').create({ data: {
      orderNumber: number,
      user: user.id,
      productType,
      membershipPlan: null,
      course: productType === 'course' ? product.documentId : null,
      productNameSnapshot: product.name ?? product.title,
      lessonHours: productType === 'course' ? Number(product.lessonHours ?? 0) : 0,
      unitPrice: amount,
      quantity: 1,
      originalAmount: amount,
      discountAmount: 0,
      paidAmount: 0,
      currency,
      channel: 'paypal',
      orderStatus: 'awaiting-payment',
      paymentStatus: 'unpaid',
      platform,
    } as any });
    await attachReferralToOrder(user.id, Number(order.id), productType === 'course' ? product.id : undefined);
    const paypal = strapi.service('api::payment.paypal');
    const external = await paypal.createOrder({ amount: money(amount), currency, internalOrderNumber: number });
    await strapi.documents('api::order.order').update({ documentId: order.documentId, data: { externalOrderId: external.id } as any });
    ctx.body = { orderNumber: number, paypalOrderId: external.id, status: external.status, links: external.links };
  },

  async capturePayPalOrder(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const { paypalOrderId } = ctx.request.body as { paypalOrderId?: string };
    if (typeof paypalOrderId !== 'string' || !paypalOrderId) return ctx.badRequest('paypalOrderId is required');
    const orders = await strapi.documents('api::order.order').findMany({ filters: { externalOrderId: paypalOrderId, user: { id: user.id } }, limit: 1 });
    const order = orders[0];
    if (!order) return ctx.notFound('Order not found');
    // Reject unsupported/terminal orders before any request that can collect funds.
    if (order.channel !== 'paypal' || order.productType !== 'course'
      || !['pending', 'awaiting-payment', 'paid', 'completed'].includes(String(order.orderStatus))
      || !['unpaid', 'authorized', 'paid'].includes(String(order.paymentStatus))
      || !['USD', 'CNY', 'EUR', 'GBP'].includes(String(order.currency))) {
      return ctx.badRequest('Order requires reconciliation before payment');
    }
    try { expectedOrderAmount(order); } catch { return ctx.badRequest('Invalid order payable amount'); }
    const paypal = strapi.service('api::payment.paypal');
    const result = order.paymentStatus === 'paid'
      ? await paypal.getOrder(paypalOrderId)
      : await paypal.captureOrder(paypalOrderId, `${order.orderNumber}-capture`);
    ctx.body = await settlePayPalOrder(strapi, { paypalOrderId, userId: user.id, result });
  },

  async createPayPalSubscription(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const { planDocumentId, billingCycle = 'monthly', returnUrl, cancelUrl } = ctx.request.body as Record<string, string>;
    if (!['monthly', 'yearly'].includes(billingCycle)) return ctx.badRequest('Invalid billing cycle');
    const plan: any = await strapi.documents('api::membership-plan.membership-plan').findOne({ documentId: planDocumentId, status: 'published' });
    if (!plan?.enabled) return ctx.badRequest('Membership plan is unavailable');
    const paypalPlanId = billingCycle === 'yearly' ? plan.paypalYearlyPlanId : plan.paypalMonthlyPlanId;
    if (!paypalPlanId) return ctx.badRequest('PayPal plan is not configured');
    const billingAmount = Number(billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice);
    if (!['vip', 'svip'].includes(plan.code) || !Number.isFinite(billingAmount) || billingAmount <= 0) {
      return ctx.badRequest('Membership plan pricing is invalid');
    }
    const record: any = await strapi.documents('api::membership-subscription.membership-subscription').create({ data: {
      subscriptionNumber: subscriptionNumber(), user: user.id, plan: plan.documentId,
      channel: 'paypal', status: 'suspended', autoRenew: true,
      externalPlanId: paypalPlanId,
      billingAmount,
      billingCurrency: plan.currency,
    } as any });
    const paypal = strapi.service('api::payment.paypal');
    const result = await paypal.createSubscription({
      planId: paypalPlanId, internalSubscriptionId: record.documentId,
      returnUrl: returnUrl || `${process.env.CLIENT_APP_URL ?? 'http://localhost:3000'}/account/billing/success`,
      cancelUrl: cancelUrl || `${process.env.CLIENT_APP_URL ?? 'http://localhost:3000'}/account/billing/cancelled`,
    });
    await strapi.documents('api::membership-subscription.membership-subscription').update({ documentId: record.documentId, data: { externalSubscriptionId: result.id } as any });
    ctx.body = { subscriptionNumber: record.subscriptionNumber, paypalSubscriptionId: result.id, status: result.status, links: result.links };
  },

  async paypalWebhook(ctx: any) {
    const event = ctx.request.body as any;
    if (!event || typeof event.id !== 'string' || !event.id || typeof event.event_type !== 'string') {
      return ctx.badRequest('Invalid PayPal webhook event');
    }
    try {
      const paypal = strapi.service('api::payment.paypal');
      const headers = Object.fromEntries(Object.entries(ctx.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
      const valid = await paypal.verifyWebhook(headers, event);
      if (!valid) return ctx.unauthorized('Invalid PayPal webhook signature');
      ctx.body = await processPayPalWebhook(strapi, event);
    } catch (error) {
      // Non-2xx is essential: PayPal only retries unsuccessful delivery.
      strapi.log.error(`PayPal webhook ${event.id} processing failed`);
      ctx.status = 503;
      ctx.body = { received: true, processed: false, retryable: true };
    }
  },
};
