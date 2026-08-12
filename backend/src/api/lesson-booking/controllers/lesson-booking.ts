import { factories } from '@strapi/strapi';
import { bookingUserId, serializeBooking } from '../services/lesson-booking';

const uid = 'api::lesson-booking.lesson-booking';

async function findCourse(strapi: any, value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const numericId = Number(text);
  if (Number.isFinite(numericId)) return strapi.db.query('api::course.course').findOne({ where: { id: numericId } });
  const courses = await strapi.db.query('api::course.course').findMany({ where: { slug: text }, limit: 1 });
  return courses[0] ?? null;
}

function parseDate(value: unknown) {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default factories.createCoreController(uid, ({ strapi }) => ({
  async me(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const bookings = await strapi.db.query(uid).findMany({
      where: { user: user.id },
      populate: { course: true, teacherUser: true, reservedCredit: true },
      orderBy: { requestedStartAt: 'desc' },
    });
    ctx.body = { data: await Promise.all(bookings.map(serializeBooking)) };
  },

  async createForCurrentUser(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const body = (ctx.request.body?.data ?? ctx.request.body ?? {}) as Record<string, unknown>;
    const course = await findCourse(strapi, body.courseSlug ?? body.course);
    const start = parseDate(body.requestedStartAt);
    const timezone = String(body.timezone ?? '').trim();
    if (!course || !start || !timezone) return ctx.badRequest('Course, date/time, and timezone are required.');
    if (start.getTime() < Date.now() - 5 * 60 * 1000) return ctx.badRequest('Please choose a future time.');
    const end = parseDate(body.requestedEndAt) ?? new Date(start.getTime() + 60 * 60 * 1000);
    if (end <= start) return ctx.badRequest('The lesson end time must be after the start time.');
    const allowedSources = new Set(['web', 'miniprogram', 'ios', 'android']);
    const booking = await strapi.db.query(uid).create({
      data: {
        user: user.id,
        course: course.id,
        teacherName: String(body.teacherName ?? '').trim() || 'To be assigned',
        requestedStartAt: start,
        requestedEndAt: end,
        timezone,
        status: 'requested',
        source: allowedSources.has(String(body.source)) ? String(body.source) : 'web',
        notes: String(body.notes ?? '').trim(),
        requestedAt: new Date(),
      },
      populate: { course: true, teacherUser: true },
    });
    ctx.body = { data: await serializeBooking(booking) };
  },

  async cancelMine(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const id = Number(ctx.params.id);
    const booking = await strapi.db.query(uid).findOne({ where: { id }, populate: { course: true, reservedCredit: true, user: true } });
    if (!booking || bookingUserId(booking) !== user.id) return ctx.notFound('Booking not found');
    if (!['requested', 'confirmed'].includes(booking.status)) return ctx.badRequest('This booking can no longer be cancelled.');
    const updated = await strapi.db.query(uid).update({ where: { id }, data: { status: 'cancelled' }, populate: { course: true, reservedCredit: true } });
    ctx.body = { data: await serializeBooking(updated) };
  },

  async completeForTeacher(ctx: any) {
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Login required');
    const id = Number(ctx.params.id);
    const booking = await strapi.db.query(uid).findOne({ where: { id }, populate: { teacherUser: true, course: true, reservedCredit: true } });
    if (!booking) return ctx.notFound('Booking not found');
    const teacherId = booking.teacherUser?.id ?? booking.teacherUser;
    if (!teacherId || Number(teacherId) !== Number(user.id)) return ctx.forbidden('Only the assigned teacher can complete this lesson.');
    if (booking.status !== 'confirmed') return ctx.badRequest('Only a confirmed lesson can be completed.');
    const updated = await strapi.db.query(uid).update({ where: { id }, data: { status: 'completed' }, populate: { course: true, teacherUser: true } });
    ctx.body = { data: await serializeBooking(updated) };
  },
}));
