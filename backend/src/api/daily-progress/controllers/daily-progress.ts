import { factories } from '@strapi/strapi';
import { grantUnifiedTrialLesson } from '../../lesson-credit/services/grant';

function serializeProgress(records: any[], reward?: any) {
  const completed = Array.from(new Set(records.map((record) => Number(record.dayNumber))))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
    .sort((a, b) => a - b);
  const latest = [...records].sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()).at(-1);
  return {
    completed,
    streak: records.reduce((max, record) => Math.max(max, Number(record.streak ?? 0)), 0),
    lastCompletedAt: latest?.completedAt ?? null,
    reward: reward ? {
      status: reward.status,
      hours: Number(reward.hours ?? 0),
      grantedAt: reward.grantedAt ?? null,
    } : null,
  };
}

export default factories.createCoreController('api::daily-progress.daily-progress' as any, ({ strapi }) => ({
  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Sign in to save daily progress');
    const body = (ctx.request.body?.data ?? {}) as Record<string, unknown>;
    const dayNumber = Number(body.dayNumber ?? body.day);
    const completedAt = String(body.completedAt ?? new Date().toISOString());
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) return ctx.badRequest('Invalid challenge day');

    const existing = await strapi.db.query('api::daily-progress.daily-progress').findOne({
      where: { user: ctx.state.user.id, dayNumber },
    });
    let record = existing;
    if (!record) {
      record = await strapi.db.query('api::daily-progress.daily-progress').create({
        data: {
          user: ctx.state.user.id,
          dayNumber,
          completedAt,
          streak: Math.max(1, Number(body.streak ?? 1)),
          source: String(body.source ?? 'daily-challenge'),
          platform: String(body.platform ?? 'web'),
        },
      });
    }

    const records = await strapi.db.query('api::daily-progress.daily-progress').findMany({
      where: { user: ctx.state.user.id },
      orderBy: { completedAt: 'asc' },
    });
    const reward = records.some((item) => Number(item.dayNumber) === 7)
      ? await grantUnifiedTrialLesson(strapi, {
        userId: ctx.state.user.id,
        source: 'daily-challenge',
        notes: 'Completed the SureMandarin 7-Day Chinese Speaking Challenge.',
      })
      : undefined;
    ctx.body = { data: serializeProgress(records, reward), saved: true, recordId: record.id };
  },

  async me(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Sign in to sync daily progress');
    const records = await strapi.db.query('api::daily-progress.daily-progress').findMany({
      where: { user: ctx.state.user.id },
      orderBy: { completedAt: 'asc' },
    });
    const reward = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({
      where: { user: ctx.state.user.id, source: 'daily-challenge' },
      orderBy: { grantedAt: 'desc' },
    });
    ctx.body = { data: serializeProgress(records, reward), saved: true };
  },
}));
