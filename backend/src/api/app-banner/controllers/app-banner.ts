import { factories } from '@strapi/strapi';

const BANNER_UID = 'api::app-banner.app-banner' as const;

function safeBannerQuery(query: Record<string, unknown>) {
  const allowed = ['image', 'course'];
  const value = query.populate;
  const requested = value === '*' ? allowed
    : typeof value === 'string' ? value.split(',').map((item) => item.trim().split('.')[0])
      : Array.isArray(value) ? value.map((item) => String(item).split('.')[0])
        : value && typeof value === 'object' ? Object.entries(value).filter(([, setting]) => setting !== false && setting != null).map(([key]) => key) : [];
  // Clients must request an article through its own guarded endpoint.
  return {
    ...query,
    status: 'published',
    populate: Object.fromEntries(allowed.filter((key) => requested.includes(key)).map((key) => [key, true])),
    filters: { $and: [query.filters ?? {}, { enabled: { $eq: true } }] },
  };
}

export default factories.createCoreController(BANNER_UID, ({ strapi }) => ({
  async find(ctx) {
    await this.validateQuery!(ctx);
    const query = safeBannerQuery(await this.sanitizeQuery!(ctx));
    const { results, pagination } = await strapi.service(BANNER_UID).find(query);
    const output = await this.sanitizeOutput!(results, ctx);
    return this.transformResponse!(output, { pagination });
  },

  async findOne(ctx) {
    await this.validateQuery!(ctx);
    const query = safeBannerQuery(await this.sanitizeQuery!(ctx));
    const entity = await strapi.service(BANNER_UID).findOne(ctx.params.id, query);
    if (!entity) return ctx.notFound();
    const output = await this.sanitizeOutput!(entity, ctx);
    return this.transformResponse!(output);
  },
}));
