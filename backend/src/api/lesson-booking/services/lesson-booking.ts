const BOOKING_UID = 'api::lesson-booking.lesson-booking';
const CREDIT_UID = 'api::lesson-credit.lesson-credit';

function asId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  if (value && typeof value === 'object' && 'id' in value) return asId((value as { id?: unknown }).id);
  return undefined;
}

function appendNote(existing: unknown, note: string) {
  const current = String(existing ?? '').trim();
  return current ? `${current}\n${note}` : note;
}

export function bookingUserId(booking: any) {
  return asId(booking?.user?.id ?? booking?.user);
}

export function bookingCourseId(booking: any) {
  return asId(booking?.course?.id ?? booking?.course);
}

export async function getBooking(strapi: any, id: unknown) {
  const bookingId = asId(id);
  const where = bookingId ? { id: bookingId } : typeof id === 'string' && id.trim() ? { documentId: id.trim() } : null;
  if (!where) return null;
  return strapi.db.query(BOOKING_UID).findOne({
    where,
    populate: { user: true, course: true, teacherUser: true, reservedCredit: true },
  });
}

async function findAvailableCredit(strapi: any, userId: number) {
  const credits = await strapi.db.query(CREDIT_UID).findMany({
    where: { user: userId, status: 'available' },
    orderBy: { grantedAt: 'asc' },
  });
  const now = Date.now();
  return credits.find((credit: any) => Number(credit.hours ?? 0) > 0 && (!credit.expiresAt || new Date(credit.expiresAt).getTime() > now)) ?? null;
}

async function reserveOneHour(strapi: any, credit: any, booking: any) {
  const creditHours = Number(credit.hours ?? 0);
  if (creditHours <= 0) throw new Error('No available lesson credit remains for this booking.');
  if (creditHours <= 1) {
    return strapi.db.query(CREDIT_UID).update({
      where: { id: credit.id },
      data: { hours: 1, status: 'reserved', notes: appendNote(credit.notes, `Reserved for lesson booking ${booking.id}.`) },
    });
  }
  await strapi.db.query(CREDIT_UID).update({
    where: { id: credit.id },
    data: { hours: Number((creditHours - 1).toFixed(2)) },
  });
  return strapi.db.query(CREDIT_UID).create({
    data: {
      user: bookingUserId(booking),
      hours: 1,
      source: credit.source,
      sourceKey: `booking-reservation:${booking.id}:${Date.now()}`,
      status: 'reserved',
      grantedAt: credit.grantedAt ?? new Date(),
      expiresAt: credit.expiresAt ?? null,
      notes: appendNote(credit.notes, `Reserved for lesson booking ${booking.id}.`),
    },
  });
}

async function reserveCredit(strapi: any, userId: number, booking: any) {
  const existingCreditId = asId(booking?.reservedCredit?.id ?? booking?.reservedCredit);
  if (existingCreditId) {
    const existing = await strapi.db.query(CREDIT_UID).findOne({ where: { id: existingCreditId } });
    if (existing?.status === 'reserved') {
      const existingHours = Number(existing.hours ?? 0);
      if (existingHours <= 1) return existing;
      await strapi.db.query(CREDIT_UID).update({ where: { id: existing.id }, data: { hours: 1 } });
      await strapi.db.query(CREDIT_UID).create({
        data: {
          user: userId,
          hours: Number((existingHours - 1).toFixed(2)),
          source: existing.source,
          sourceKey: `booking-release:${booking.id}:${Date.now()}`,
          status: 'available',
          grantedAt: existing.grantedAt ?? new Date(),
          expiresAt: existing.expiresAt ?? null,
          notes: appendNote(existing.notes, `Split excess hours from lesson booking ${booking.id}.`),
        },
      });
      return strapi.db.query(CREDIT_UID).findOne({ where: { id: existing.id } });
    }
    if (existing?.status === 'available') {
      return reserveOneHour(strapi, existing, booking);
    }
  }
  const credit = await findAvailableCredit(strapi, userId);
  if (!credit) throw new Error('No available lesson credit remains for this booking.');
  return reserveOneHour(strapi, credit, booking);
}

async function releaseCredit(strapi: any, booking: any) {
  const creditId = asId(booking?.reservedCredit?.id ?? booking?.reservedCredit);
  if (!creditId) return;
  const credit = await strapi.db.query(CREDIT_UID).findOne({ where: { id: creditId } });
  if (credit?.status === 'reserved') {
    await strapi.db.query(CREDIT_UID).update({
      where: { id: credit.id },
      data: { status: 'available', notes: appendNote(credit.notes, `Released after lesson booking ${booking.id} was cancelled.`) },
    });
  }
}

async function consumeCredit(strapi: any, booking: any) {
  const creditId = asId(booking?.reservedCredit?.id ?? booking?.reservedCredit);
  if (!creditId) throw new Error('This booking has no reserved lesson credit.');
  const credit = await strapi.db.query(CREDIT_UID).findOne({ where: { id: creditId } });
  if (!credit) throw new Error('The reserved lesson credit could not be found.');
  if (credit.status === 'used') return credit;
  if (credit.status !== 'reserved') throw new Error('The lesson credit is not reserved for this booking.');
  return strapi.db.query(CREDIT_UID).update({
    where: { id: credit.id },
    data: { status: 'used', usedAt: new Date(), notes: appendNote(credit.notes, `Used for completed lesson booking ${booking.id}.`) },
  });
}

const transitions: Record<string, string[]> = {
  requested: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function prepareBookingTransition(strapi: any, event: any) {
  const nextStatus = String(event.params?.data?.status ?? '');
  if (!nextStatus) return;
  const current = await getBooking(strapi, event.params?.where?.id ?? event.params?.where?.documentId);
  if (!current || current.status === nextStatus) return;
  if (!transitions[String(current.status)]?.includes(nextStatus)) {
    throw new Error(`Invalid lesson booking status change: ${current.status} → ${nextStatus}`);
  }

  const data = event.params.data as Record<string, unknown>;
  const userId = bookingUserId(current);
  if (!userId) throw new Error('This booking has no learner.');

  if (nextStatus === 'confirmed') {
    const credit = await reserveCredit(strapi, userId, current);
    data.reservedCredit = credit.id;
    data.confirmedAt = new Date();
  }
  if (nextStatus === 'cancelled') {
    await releaseCredit(strapi, current);
    data.cancelledAt = new Date();
  }
  if (nextStatus === 'completed') {
    await consumeCredit(strapi, current);
    data.completedAt = new Date();
  }
}

export async function serializeBooking(booking: any) {
  return {
    id: booking.id,
    status: booking.status,
    requestedStartAt: booking.requestedStartAt,
    requestedEndAt: booking.requestedEndAt,
    timezone: booking.timezone,
    teacherUserId: asId(booking?.teacherUser?.id ?? booking?.teacherUser) ?? null,
    teacherName: booking.teacherName ?? booking.teacherUser?.fullName ?? booking.teacherUser?.username ?? null,
    notes: booking.notes ?? '',
    confirmedAt: booking.confirmedAt,
    completedAt: booking.completedAt,
    cancelledAt: booking.cancelledAt,
    course: booking.course ? { title: booking.course.title, slug: booking.course.slug, summary: booking.course.summary } : null,
  };
}
