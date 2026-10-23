import { createHash, randomBytes } from 'node:crypto';
import { grantReferralTrialLesson } from '../api/referral/services/referral-rewards';
import { withUserLock } from './user-transaction';

const USER_UID = 'plugin::users-permissions.user';
const REFERRAL_UID = 'api::referral.referral';
const SOURCES = new Set(['website', 'whatsapp', 'facebook', 'email', 'miniprogram', 'ios', 'android', 'other']);
export const REFERRAL_PROTECTED_FIELDS = [
  'referralCode', 'referredByCode', 'referralSource', 'registrationIdentityKey', 'referralCount',
  'referralRewardBalance', 'referrer', 'referredUser', 'rewardStatus', 'rewardHours',
  'rewardAmount', 'lessonHoursBalance',
];

export function normalizeReferralCode(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const code = value.trim();
  return code && code.length <= 80 ? code : undefined;
}

const emailKey = (email: string) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const newReferralCode = () => `SM-${randomBytes(12).toString('hex').toUpperCase()}`;
const referralSource = (value: unknown) => typeof value === 'string' && SOURCES.has(value) ? value : 'website';

// Runs only before account creation, never on login/profile update. The unique
// identity key closes the concurrent duplicate-email gap in provider registration;
// the lookup also protects older accounts without the new key. No backfill occurs.
export async function prepareReferralRegistration(strapi: any, data: Record<string, any>) {
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email) return;
  const existing = await strapi.db.query(USER_UID).findOne({ where: { email: { $eqi: email } } });
  if (existing) throw new Error('Email is already taken.');
  data.email = email;
  data.registrationIdentityKey = emailKey(email);
  data.referralCode = newReferralCode();
  const code = normalizeReferralCode(data.referredByCode);
  data.referredByCode = null;
  if (!code) return;
  const referrer = await strapi.db.query(USER_UID).findOne({ where: { referralCode: code } });
  if (!referrer || referrer.blocked || String(referrer.email ?? '').trim().toLowerCase() === email) return;
  data.referredByCode = code;
}

export async function createReferralRecord(strapi: any, user: any, registrationData: any) {
  const code = normalizeReferralCode(user?.referredByCode ?? registrationData?.referredByCode);
  if (!code || !user?.id) return;
  return withUserLock(strapi, user.id, async () => {
    // Trust the persisted creation data; this helper cannot be used to add a code
    // supplied later for an existing member.
    const member = await strapi.db.query(USER_UID).findOne({ where: { id: user.id } });
    if (!member?.registrationIdentityKey || member.referredByCode !== code) return;
    const referrer = await strapi.db.query(USER_UID).findOne({ where: { referralCode: code } });
    if (!referrer || referrer.blocked || referrer.id === member.id
      || String(referrer.email ?? '').trim().toLowerCase() === String(member.email).trim().toLowerCase()) return;
    return withUserLock(strapi, referrer.id, async () => {
      const existing = await strapi.db.query(REFERRAL_UID).findOne({
        where: { referredUser: member.id }, populate: { referrer: true },
      });
      if (existing && existing.referrer?.id !== referrer.id) return;
      if (!existing) {
        await strapi.db.query(REFERRAL_UID).create({ data: {
          registrationKey: `registration:${member.id}`,
          referredIdentityKey: member.registrationIdentityKey,
          referralCode: code,
          sourceChannel: referralSource(registrationData?.referralSource ?? registrationData?.registrationSource),
          referrer: referrer.id,
          referredUser: member.id,
          rewardStatus: 'pending', rewardAmount: 0, rewardHours: 0, rewardCurrency: 'USD',
          registeredAt: new Date().toISOString(),
        } });
      }
      await grantReferralTrialLesson(strapi, member.id);
      const referralCount = await strapi.db.query(REFERRAL_UID).count({ where: { referrer: referrer.id } });
      await strapi.db.query(USER_UID).update({ where: { id: referrer.id }, data: { referralCount } });
    });
  });
}

// Existing members receive a real shareable code on their own authenticated /me
// request. This does not create a referral relationship or award any credit.
export async function ensureReferralCode(strapi: any, userId: number) {
  return withUserLock(strapi, userId, async () => {
    const user = await strapi.db.query(USER_UID).findOne({ where: { id: userId } });
    if (user.referralCode) return user.referralCode;
    const referralCode = newReferralCode();
    await strapi.db.query(USER_UID).update({ where: { id: userId }, data: { referralCode } });
    return referralCode;
  });
}
