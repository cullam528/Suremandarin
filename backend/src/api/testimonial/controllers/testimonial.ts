import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::testimonial.testimonial', ({ strapi }) => ({
  async submit(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');

    const membershipLevel = String(user.membershipLevel ?? '').toLowerCase();
    const now = Date.now();
    const started = user.membershipStartedAt == null
      ? -Infinity : new Date(user.membershipStartedAt).getTime();
    const expires = user.membershipExpiresAt == null
      ? Infinity : new Date(user.membershipExpiresAt).getTime();
    // Match article access: a retained VIP label is not an active entitlement.
    if (user.blocked || !['active', 'trial'].includes(user.membershipStatus ?? '')
      || !(started <= now && expires > now)
      || (membershipLevel !== 'vip' && membershipLevel !== 'svip')) {
      return ctx.forbidden('VIP or SVIP membership is required to submit a testimonial');
    }

    const body = ctx.request.body ?? {};
    const quote = String(body.quote ?? '').trim();
    const country = String(body.country ?? '').trim();
    const rating = Number(body.rating ?? 5);

    if (quote.length < 10 || quote.length > 1000) {
      return ctx.badRequest('Quote must be between 10 and 1000 characters');
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return ctx.badRequest('Rating must be an integer from 1 to 5');
    }

    const testimonial = await strapi.documents('api::testimonial.testimonial').create({
      status: 'draft',
      data: {
        studentName: String(user.fullName || user.username || user.email || 'SureMandarin learner'),
        country,
        quote,
        rating,
        studentType: 'Website learner',
        featured: false,
        enabled: false,
        sortOrder: 999,
      },
    });

    ctx.body = { data: testimonial };
  },
}));
