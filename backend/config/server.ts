import type { Core } from '@strapi/strapi';
import { evaluateAllReferralRewards } from '../src/api/referral/services/referral-rewards';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  // Render terminates TLS before forwarding requests to Strapi. Trust its
  // forwarded protocol header so Koa can safely issue secure auth cookies.
  proxy: {
    koa: env.bool('PROXY_KOA', env('NODE_ENV') === 'production'),
  },
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
