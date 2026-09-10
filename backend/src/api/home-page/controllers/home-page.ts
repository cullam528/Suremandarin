import { factories } from '@strapi/strapi';

const HOME_UID = 'api::home-page.home-page' as const;

function safeHomeQuery(query: Record<string, unknown>) {
  const allowed = ['heroSlides', 'seo', 'featuredCourses', 'featuredTestimonials'];
  const value = query.populate;
  const requested = value === '*' ? allowed
    : typeof value === 'string' ? value.split(',').map((item) => item.trim().split('.')[0])
      : Array.isArray(value) ? value.map((item) => String(item).split('.')[0])
        : value && typeof value === 'object' ? Object.entries(value).filter(([, setting]) => setting !== false && setting != null).map(([key]) => key) : [];
  // Keep the homepage's images and SEO fields, but never expand featuredArticles
  // or accept nested relation requests that sidestep article membership checks.
  const populate = Object.fromEntries(allowed.filter((key) => requested.includes(key)).map((key) => [
    key,
    key === 'heroSlides' ? { populate: { image: true } }
      : key === 'seo' ? { populate: { shareImage: true } }
        : true,
  ]));
  return { ...query, status: 'published', populate };
}

export default factories.createCoreController(HOME_UID, ({ strapi }) => ({
  async find(ctx) {
    await this.validateQuery!(ctx);
    const query = safeHomeQuery(await this.sanitizeQuery!(ctx));
    const entity = await strapi.service(HOME_UID).find(query);
    const output = await this.sanitizeOutput!(entity, ctx);
    return this.transformResponse!(output);
  },
}));
