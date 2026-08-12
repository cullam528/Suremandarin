const USER_UID = 'plugin::users-permissions.user';
const CREDIT_UID = 'api::lesson-credit.lesson-credit';
const REMAINING_STATUSES = ['available', 'reserved'];

const syncingUsers = new Set<number>();

function asId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object' && 'id' in value) return asId((value as { id?: unknown }).id);
  return undefined;
}

function hours(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function lessonCreditUserId(credit: any) {
  return asId(credit?.user?.id ?? credit?.user);
}

export function isSyncingLessonBalance(userId: unknown) {
  const id = asId(userId);
  return Boolean(id && syncingUsers.has(id));
}

export async function getLessonHourSummary(strapi: any, userId: unknown) {
  const id = asId(userId);
  if (!id) return { remaining: 0, available: 0, reserved: 0 };
  const credits = await strapi.db.query(CREDIT_UID).findMany({
    where: { user: id, status: { $in: REMAINING_STATUSES } },
  });
  const available = credits
    .filter((credit: any) => credit.status === 'available')
    .reduce((sum: number, credit: any) => sum + hours(credit.hours), 0);
  const reserved = credits
    .filter((credit: any) => credit.status === 'reserved')
    .reduce((sum: number, credit: any) => sum + hours(credit.hours), 0);
  return { remaining: available + reserved, available, reserved };
}

export async function syncLessonHoursBalance(strapi: any, userId: unknown) {
  const id = asId(userId);
  if (!id || syncingUsers.has(id)) return;
  const summary = await getLessonHourSummary(strapi, id);
  syncingUsers.add(id);
  try {
    await strapi.db.query(USER_UID).update({
      where: { id },
      data: { lessonHoursBalance: summary.remaining },
    });
  } finally {
    syncingUsers.delete(id);
  }
}

export async function validateLessonHoursTarget(strapi: any, userId: unknown, targetValue: unknown) {
  const target = hours(targetValue);
  const summary = await getLessonHourSummary(strapi, userId);
  if (target < summary.reserved) {
    throw new Error(`剩余课时不能低于已预约的 ${summary.reserved} 课时，请先取消相关预约。`);
  }
  return target;
}

export async function adjustLessonHoursBalance(strapi: any, userId: unknown, targetValue: unknown) {
  const id = asId(userId);
  if (!id) return;
  const target = await validateLessonHoursTarget(strapi, id, targetValue);
  const summary = await getLessonHourSummary(strapi, id);
  const delta = Number((target - summary.remaining).toFixed(2));
  if (Math.abs(delta) < 0.001) {
    await syncLessonHoursBalance(strapi, id);
    return;
  }

  if (delta > 0) {
    await strapi.db.query(CREDIT_UID).create({
      data: {
        user: id,
        hours: delta,
        source: 'manual',
        sourceKey: `manual-balance:${id}:${Date.now()}`,
        status: 'available',
        grantedAt: new Date(),
        notes: `后台人工将剩余课时调整为 ${target}。`,
      },
    });
    await syncLessonHoursBalance(strapi, id);
    return;
  }

  let amountToRemove = Math.abs(delta);
  const availableCredits = await strapi.db.query(CREDIT_UID).findMany({
    where: { user: id, status: 'available' },
    orderBy: { grantedAt: 'desc' },
  });
  for (const credit of availableCredits) {
    if (amountToRemove <= 0.001) break;
    const currentHours = hours(credit.hours);
    if (currentHours <= amountToRemove + 0.001) {
      amountToRemove = Number((amountToRemove - currentHours).toFixed(2));
      await strapi.db.query(CREDIT_UID).update({
        where: { id: credit.id },
        data: {
          status: 'revoked',
          notes: `${String(credit.notes ?? '').trim()}\n后台人工减少剩余课时。`.trim(),
        },
      });
    } else {
      await strapi.db.query(CREDIT_UID).update({
        where: { id: credit.id },
        data: {
          hours: Number((currentHours - amountToRemove).toFixed(2)),
          notes: `${String(credit.notes ?? '').trim()}\n后台人工减少 ${amountToRemove} 课时。`.trim(),
        },
      });
      amountToRemove = 0;
    }
  }
  await syncLessonHoursBalance(strapi, id);
}

export async function syncAllLessonHoursBalances(strapi: any) {
  const users = await strapi.db.query(USER_UID).findMany({ select: ['id'] });
  for (const user of users) await syncLessonHoursBalance(strapi, user.id);
}
