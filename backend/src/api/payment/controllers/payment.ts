import { evaluateReferralRewards, markReferralPayment } from '../../referral/services/referral-rewards';
import { grantLessonCredit } from '../../lesson-credit/services/grant';

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

async function grantMembership(userId: number, level: 'vip' | 'svip', subscriptionDocumentId: string, expiresAt?: string) {
  await strapi.db.query('plugin::users-permissions.user').update({ where: { id: userId }, data: {
    membershipLevel: level, membershipStatus: 'active', membershipStartedAt: new Date(),
    membershipExpiresAt: expiresAt ? new Date(expiresAt) : null, autoRenew: true,
    membershipChannel: 'paypal', lastPaymentAt: new Date(),
  }});
  const codes = level === 'svip'
    ? ['article.vip.read','article.svip.read','course.basic.access','course.premium.access','video.download','support.priority']
    : ['article.vip.read','course.basic.access','video.download'];
  for (const code of codes) {
    const existing = await strapi.documents('api::entitlement.entitlement').findMany({ filters: { user: { id: userId }, code, status: 'active' }, limit: 1 });
    if (!existing.length) await strapi.documents('api::entitlement.entitlement').create({ data: {
      user: userId, code, name: code, source: 'membership', subscription: subscriptionDocumentId,
      startsAt: new Date().toISOString(), expiresAt, status: 'active', usedCount: 0,
      platforms: ['web','miniprogram','ios','android'],
    } as any });
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
      orders: orders.map((item: any) => ({ orderNumber: item.orderNumber, productType: item.productType, productName: item.productNameSnapshot, paidAmount: item.paidAmount ?? item.unitPrice, currency: item.currency, orderStatus: item.orderStatus, paymentStatus: item.paymentStatus, paidAt: item.paidAt, createdAt: item.createdAt, lessonHours: Number(item.lessonHours ?? 0) })),
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
    const { productType, planDocumentId, courseDocumentId, billingCycle = 'monthly', platform = 'web' } = ctx.request.body as Record<string, string>;
    let product: any;
    let amount = 0;
    let currency = 'USD';
    if (productType === 'membership' && planDocumentId) {
      product = await strapi.documents('api::membership-plan.membership-plan').findOne({ documentId: planDocumentId, status: 'published' });
      if (!product?.enabled) return ctx.badRequest('Membership plan is unavailable');
      amount = Number(billingCycle === 'yearly' ? product.yearlyPrice : product.monthlyPrice);
      currency = product.currency;
    } else if (productType === 'course' && courseDocumentId) {
      product = await strapi.documents('api::course.course').findOne({ documentId: courseDocumentId, status: 'published' });
      if (!product?.enabled || !product.allowStandalonePurchase) return ctx.badRequest('Course is unavailable for purchase');
      amount = Number(product.standalonePrice);
      currency = product.currency;
    } else return ctx.badRequest('Invalid product');
    if (!(amount > 0)) return ctx.badRequest('Product price is invalid');

    const number = orderNumber();
    const order = await strapi.documents('api::order.order').create({ data: {
      orderNumber: number,
      user: user.id,
      productType,
      membershipPlan: productType === 'membership' ? product.documentId : null,
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
    if (!paypalOrderId) return ctx.badRequest('paypalOrderId is required');
    const orders = await strapi.documents('api::order.order').findMany({ filters: { externalOrderId: paypalOrderId, user: { id: user.id } }, limit: 1 });
    const order = orders[0];
    if (!order) return ctx.notFound('Order not found');
    const paypal = strapi.service('api::payment.paypal');
    const result = await paypal.captureOrder(paypalOrderId, `${order.orderNumber}-capture`);
    if (String(result.status ?? '').toUpperCase() === 'COMPLETED') {
      const paidAt = new Date().toISOString();
      await strapi.documents('api::order.order').update({
        documentId: order.documentId,
        data: {
          orderStatus: 'paid',
          paymentStatus: 'paid',
          paidAmount: order.paidAmount ?? order.unitPrice,
          paidAt,
        } as any,
      });
      await markReferralPayment(strapi, { ...order, paidAt, orderStatus: 'paid', paymentStatus: 'paid' });
      await evaluateReferralRewards(strapi, user.id);
      const purchasedHours = Number(order.lessonHours ?? 0);
      if (order.productType === 'course' && purchasedHours > 0) {
        await grantLessonCredit(strapi, {
          userId: user.id,
          hours: purchasedHours * Number(order.quantity ?? 1),
          source: 'purchase',
          sourceKey: `purchase-order-v1:${order.documentId ?? order.id}`,
          status: 'available',
          notes: `Purchased lesson hours from order ${order.orderNumber}.`,
        });
      }
    }
    ctx.body = { orderNumber: order.orderNumber, paypalStatus: result.status, processing: true };
  },

  async createPayPalSubscription(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const { planDocumentId, billingCycle = 'monthly', returnUrl, cancelUrl } = ctx.request.body as Record<string, string>;
    const plan: any = await strapi.documents('api::membership-plan.membership-plan').findOne({ documentId: planDocumentId, status: 'published' });
    if (!plan?.enabled) return ctx.badRequest('Membership plan is unavailable');
    const paypalPlanId = billingCycle === 'yearly' ? plan.paypalYearlyPlanId : plan.paypalMonthlyPlanId;
    if (!paypalPlanId) return ctx.badRequest('PayPal plan is not configured');
    const record: any = await strapi.documents('api::membership-subscription.membership-subscription').create({ data: {
      subscriptionNumber: subscriptionNumber(), user: user.id, plan: plan.documentId,
      channel: 'paypal', status: 'suspended', autoRenew: true,
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
    const paypal = strapi.service('api::payment.paypal');
    const headers = Object.fromEntries(Object.entries(ctx.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
    const valid = await paypal.verifyWebhook(headers, event);
    if (!valid) return ctx.unauthorized('Invalid PayPal webhook signature');
    const existing = await strapi.documents('api::webhook-event.webhook-event').findMany({ filters: { externalEventId: event.id }, limit: 1 });
    if (existing.length) { ctx.body = { received: true, duplicate: true }; return; }
    await strapi.documents('api::webhook-event.webhook-event').create({ data: {
      provider: 'paypal', externalEventId: event.id, eventType: event.event_type,
      receivedAt: new Date().toISOString(), signatureValid: true, processed: false,
      processingAttempts: 0, payload: event,
    } });
    let processed = false;
    try {
      const externalSubscriptionId = event.resource?.id;
      const subscriptionDocumentId = event.resource?.custom_id;
      const subscriptionList: any[] = await strapi.documents('api::membership-subscription.membership-subscription').findMany({
        filters: subscriptionDocumentId ? { documentId: subscriptionDocumentId } : { externalSubscriptionId },
        populate: ['user','plan'], limit: 1,
      } as any);
      const subscription: any = subscriptionList[0];
      if (subscription && event.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
        const expiresAt = event.resource?.billing_info?.next_billing_time;
        await strapi.documents('api::membership-subscription.membership-subscription').update({ documentId: subscription.documentId, data: {
          status: 'active', startedAt: event.resource?.start_time ?? new Date().toISOString(),
          currentPeriodEnd: expiresAt, nextBillingAt: expiresAt, lastPaidAt: new Date().toISOString(),
        } as any });
        await grantMembership(subscription.user.id, subscription.plan.code, subscription.documentId, expiresAt);
        processed = true;
      }
      if (subscription && ['BILLING.SUBSCRIPTION.CANCELLED','BILLING.SUBSCRIPTION.EXPIRED','BILLING.SUBSCRIPTION.SUSPENDED'].includes(event.event_type)) {
        const status = event.event_type.endsWith('CANCELLED') ? 'cancelled' : event.event_type.endsWith('EXPIRED') ? 'expired' : 'suspended';
        await strapi.documents('api::membership-subscription.membership-subscription').update({ documentId: subscription.documentId, data: { status, autoRenew: false, cancelledAt: new Date().toISOString() } as any });
        await strapi.db.query('plugin::users-permissions.user').update({ where: { id: subscription.user.id }, data: { membershipStatus: status, autoRenew: false } });
        processed = true;
      }
    } catch (error) {
      strapi.log.error(`PayPal webhook processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    const log = await strapi.documents('api::webhook-event.webhook-event').findMany({ filters: { externalEventId: event.id }, limit: 1 });
    if (log[0]) await strapi.documents('api::webhook-event.webhook-event').update({ documentId: log[0].documentId, data: { processed, processingAttempts: 1 } as any });
    ctx.body = { received: true, processed };
  },
};
