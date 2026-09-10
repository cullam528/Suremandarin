import { factories } from '@strapi/strapi';

const ARTICLE_UID = 'api::article.article' as const;
// These are already-public, code-managed URLs. This endpoint reveals only
// whether the CMS takes ownership of one; never arbitrary draft/private slugs.
const builtinGuideSlugs = [
  'how-ai-is-changing-language-learning',
  'hsk-and-real-life-chinese',
  'how-to-practise-tones',
  'how-to-use-pinyin-well',
  'a-beginners-guide-to-chinese-food',
  'understanding-chinese-names',
  'a-simple-spaced-repetition-plan',
  'shadowing-for-natural-rhythm',
] as const;

type ArticleReader = {
  id?: number | string;
  blocked?: boolean;
  membershipLevel?: string;
  membershipStatus?: string;
  membershipStartedAt?: string | Date | null;
  membershipExpiresAt?: string | Date | null;
};

function readableLevels(user?: ArticleReader) {
  const levels = ['public'];
  if (!user?.id || user.blocked) return levels;
  levels.push('registered');

  const now = Date.now();
  const started = user.membershipStartedAt == null
    ? -Infinity : new Date(user.membershipStartedAt).getTime();
  const expires = user.membershipExpiresAt == null
    ? Infinity : new Date(user.membershipExpiresAt).getTime();
  const active = ['active', 'trial'].includes(user.membershipStatus ?? '');
  // The status and dates are authoritative: a stale VIP label alone grants nothing.
  if (!active || !(started <= now && expires > now)) return levels;
  if (user.membershipLevel === 'vip' || user.membershipLevel === 'svip') levels.push('vip');
  if (user.membershipLevel === 'svip') levels.push('svip');
  return levels;
}

function publicArticlePopulate(value: unknown): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const allowed = ['cover', 'category', 'seo'];
  const requested = value === '*'
    ? allowed
    : typeof value === 'string'
      ? value.split(',').map((path) => path.trim().split('.')[0])
      : Array.isArray(value)
        ? value.filter((path): path is string => typeof path === 'string').map((path) => path.split('.')[0])
        : typeof value === 'object'
          ? Object.entries(value).filter(([, setting]) => setting !== false && setting != null).map(([key]) => key)
          : [];
  // Never permit category.articles (or a different nested relation) to bypass
  // the article access predicate. Public reads only need these shallow fields.
  return Object.fromEntries(allowed.filter((key) => requested.includes(key)).map((key) => [
    key,
    key === 'seo' ? { populate: { shareImage: true } } : true,
  ]));
}

function guardedQuery(query: Record<string, unknown>, user?: ArticleReader) {
  return {
    ...query,
    status: 'published',
    populate: publicArticlePopulate(query.populate),
    filters: {
      $and: [
        query.filters ?? {},
        { enabled: { $eq: true } },
        {
          $or: [
            { accessLevel: { $in: readableLevels(user) } },
            { accessLevel: { $null: true } },
          ],
        },
      ],
    },
  };
}

export default factories.createCoreController(ARTICLE_UID, ({ strapi }) => ({
  async builtinOverrides(ctx) {
    const query = ctx.query ?? {};
    const locale = query.locale ?? 'en';
    if ((locale !== 'en' && locale !== 'zh') || Object.keys(query).some((key) => key !== 'locale')) {
      return ctx.badRequest('Only locale=en or locale=zh is supported');
    }
    // Read across draft/published variants so withdrawing a CMS article does
    // not reactivate its bundled version. Select no text, IDs or private data.
    const records = await strapi.db.query(ARTICLE_UID).findMany({
      where: { locale, slug: { $in: [...builtinGuideSlugs] } },
      select: ['slug'],
    });
    const present = new Set(records.map((record) => String(record.slug)));
    return { data: builtinGuideSlugs.filter((slug) => present.has(slug)) };
  },

  async find(ctx) {
    await this.validateQuery!(ctx);
    const query = guardedQuery(await this.sanitizeQuery!(ctx), ctx.state.user);
    ctx.vary('Authorization');
    if (ctx.state.user) ctx.set('Cache-Control', 'private, no-store');
    const { results, pagination } = await strapi.service(ARTICLE_UID).find(query);
    const output = await this.sanitizeOutput!(results, ctx);
    return this.transformResponse!(output, { pagination });
  },

  async findOne(ctx) {
    await this.validateQuery!(ctx);
    const query = guardedQuery(await this.sanitizeQuery!(ctx), ctx.state.user);
    ctx.vary('Authorization');
    if (ctx.state.user) ctx.set('Cache-Control', 'private, no-store');
    const entity = await strapi.service(ARTICLE_UID).findOne(ctx.params.id, query);
    if (!entity) return ctx.notFound();
    const output = await this.sanitizeOutput!(entity, ctx);
    return this.transformResponse!(output);
  },
}));
