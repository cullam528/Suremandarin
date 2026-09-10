import { factories } from '@strapi/strapi';

const CATEGORY_UID = 'api::article-category.article-category' as const;

function safeCategoryQuery(query: Record<string, unknown>) {
  const value = query.populate;
  const requested = value === '*' ? ['image']
    : typeof value === 'string' ? value.split(',').map((item) => item.trim().split('.')[0])
      : Array.isArray(value) ? value.map((item) => String(item).split('.')[0])
        : value && typeof value === 'object' ? Object.entries(value).filter(([, setting]) => setting !== false && setting != null).map(([key]) => key) : [];
  // Article bodies are only available through the access-checked article API.
  return { ...query, status: 'published', populate: requested.includes('image') ? { image: true } : {} };
}

export default factories.createCoreController(CATEGORY_UID, ({ strapi }) => ({
  async find(ctx) {
    await this.validateQuery!(ctx);
    const query = safeCategoryQuery(await this.sanitizeQuery!(ctx));
    const { results, pagination } = await strapi.service(CATEGORY_UID).find(query);
    const output = await this.sanitizeOutput!(results, ctx);
    return this.transformResponse!(output, { pagination });
  },

  async findOne(ctx) {
    await this.validateQuery!(ctx);
    const query = safeCategoryQuery(await this.sanitizeQuery!(ctx));
    const entity = await strapi.service(CATEGORY_UID).findOne(ctx.params.id, query);
    if (!entity) return ctx.notFound();
    const output = await this.sanitizeOutput!(entity, ctx);
    return this.transformResponse!(output);
  },
}));
