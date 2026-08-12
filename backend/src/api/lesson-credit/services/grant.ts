export type LessonCreditSource = 'daily-challenge' | 'referral' | 'purchase' | 'manual';
export type LessonCreditStatus = 'pending-review' | 'available' | 'reserved' | 'used' | 'expired' | 'revoked';

export async function grantLessonCredit(
  strapi: any,
  input: {
    userId: number;
    hours: number;
    source: LessonCreditSource;
    sourceKey: string;
    status?: LessonCreditStatus;
    notes?: string;
  },
) {
  const existing = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({
    where: { sourceKey: input.sourceKey },
  });
  if (existing) return existing;

  try {
    return await strapi.db.query('api::lesson-credit.lesson-credit').create({
      data: {
        user: input.userId,
        hours: input.hours,
        source: input.source,
        sourceKey: input.sourceKey,
        status: input.status ?? 'available',
        grantedAt: new Date(),
        notes: input.notes,
      },
    });
  } catch (error) {
    const createdByAnotherRequest = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({
      where: { sourceKey: input.sourceKey },
    });
    if (createdByAnotherRequest) return createdByAnotherRequest;
    throw error;
  }
}

export async function grantUnifiedTrialLesson(strapi: any, input: {
  userId: number;
  source: LessonCreditSource;
  notes: string;
}) {
  const sourceKey = `trial-lesson-v1:${input.userId}`;
  const existing = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({ where: { sourceKey } });
  if (existing) return existing;

  // Keep users from receiving a duplicate if they completed Daily before this
  // unified trial-lesson rule was introduced.
  const legacy = await strapi.db.query('api::lesson-credit.lesson-credit').findMany({
    where: {
      user: input.userId,
      sourceKey: { $in: [`daily-7-day-v1:${input.userId}`, `referral-trial-v1:${input.userId}`] },
    },
    limit: 1,
  });
  if (legacy[0]) return legacy[0];

  return grantLessonCredit(strapi, {
    userId: input.userId,
    hours: 1,
    source: input.source,
    sourceKey,
    status: 'available',
    notes: input.notes,
  });
}
