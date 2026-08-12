import type { Core } from '@strapi/strapi';
import { evaluateAllReferralRewards } from '../src/api/referral/services/referral-rewards';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cron: {
    enabled: env.bool('CRON_ENABLED', true),
    tasks: {
      referralRewards: {
        task: async ({ strapi }) => {
          await evaluateAllReferralRewards(strapi);
        },
        // Re-check paid referrals after the refund observation window.
        options: { rule: '0 * * * *' },
      },
    },
  },
});

export default config;
