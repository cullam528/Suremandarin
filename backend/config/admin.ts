import type { Core } from '@strapi/strapi';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  // Keep optional data-release integrations from extending an undefined
  // endpoint in the admin RTK store (Transfer Token create/save).
  flags: {
    nps: false,
    promoteEE: false,
    docLinks: true,
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
});

export default config;
