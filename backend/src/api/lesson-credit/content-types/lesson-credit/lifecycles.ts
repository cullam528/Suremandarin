declare const strapi: any;

import { lessonCreditUserId, syncLessonHoursBalance } from '../../services/balance';

export default {
  async beforeUpdate(event: any) {
    const previous = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({
      where: event.params?.where,
      populate: { user: true },
    });
    event.state = { ...(event.state ?? {}), previousUserId: lessonCreditUserId(previous) };
  },
  async beforeDelete(event: any) {
    const previous = await strapi.db.query('api::lesson-credit.lesson-credit').findOne({
      where: event.params?.where,
      populate: { user: true },
    });
    event.state = { ...(event.state ?? {}), previousUserId: lessonCreditUserId(previous) };
  },
  async afterCreate(event: { result?: Record<string, unknown>; params?: { data?: Record<string, unknown> } }) {
    await syncLessonHoursBalance(strapi, lessonCreditUserId(event.result) ?? lessonCreditUserId(event.params?.data));
  },
  async afterUpdate(event: { result?: Record<string, unknown>; state?: { previousUserId?: number } }) {
    const result = event.result;
    const currentUserId = lessonCreditUserId(result) ?? event.state?.previousUserId;
    await syncLessonHoursBalance(strapi, currentUserId);
    if (event.state?.previousUserId && event.state.previousUserId !== currentUserId) {
      await syncLessonHoursBalance(strapi, event.state.previousUserId);
    }
    if (result && result.source === 'referral' && typeof result.sourceKey === 'string' && result.sourceKey.startsWith('referral-reward-v1:')) {
      const rewardStatus = result.status === 'available' ? 'paid' : result.status === 'revoked' ? 'rejected' : 'pending';
      const anchor = await strapi.db.query('api::referral.referral').findOne({ where: { rewardBatchKey: result.sourceKey } });
      if (anchor && anchor.rewardStatus !== rewardStatus) {
        await strapi.db.query('api::referral.referral').update({
          where: { id: anchor.id },
          data: { rewardStatus },
        });
      }
    }
  },
  async afterDelete(event: { state?: { previousUserId?: number } }) {
    await syncLessonHoursBalance(strapi, event.state?.previousUserId);
  },
};
