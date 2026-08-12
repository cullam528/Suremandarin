declare const strapi: any;

export default {
  async afterUpdate(event: { result?: Record<string, unknown> }) {
    const result = event.result;
    if (!result || result.source !== 'referral' || typeof result.sourceKey !== 'string' || !result.sourceKey.startsWith('referral-reward-v1:')) return;
    const rewardStatus = result.status === 'available' ? 'paid' : result.status === 'revoked' ? 'rejected' : 'pending';
    const anchor = await strapi.db.query('api::referral.referral').findOne({ where: { rewardBatchKey: result.sourceKey } });
    if (!anchor || anchor.rewardStatus === rewardStatus) return;
    await strapi.db.query('api::referral.referral').update({
      where: { id: anchor.id },
      data: { rewardStatus },
    });
  },
};
