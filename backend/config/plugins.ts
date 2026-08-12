import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  i18n: {
    enabled: true,
    config: {
      defaultLocale: 'en',
      // Keep the content locales aligned with the Next.js routes: /en and /zh.
      locales: ['en', 'zh'],
    },
  },
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
      register: {
        allowedFields: [
          'displayName', 'fullName', 'phone', 'country', 'preferredLanguage',
          'timezone', 'registrationSource', 'registrationPlatform',
          'marketingConsent', 'privacyPolicyVersion', 'privacyConsentAt',
        ],
      },
      ratelimit: {
        enabled: true,
        interval: 60000,
        max: 10,
      },
    },
  },
  email: {
    config: {
      // Strapi's official Nodemailer provider works with Resend SMTP,
      // while keeping the project compatible with other SMTP services.
      provider: env('EMAIL_PROVIDER', 'nodemailer'),
      providerOptions: {
        host: env('SMTP_HOST', 'smtp.resend.com'),
        port: env.int('SMTP_PORT', 465),
        secure: env.bool('SMTP_SECURE', true),
        auth: {
          user: env('SMTP_USERNAME', 'resend'),
          pass: env('SMTP_PASSWORD', ''),
        },
        requireTLS: env.bool('SMTP_REQUIRE_TLS', false),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'SureMandarin <hello@suremandarin.com>'),
        defaultReplyTo: env('EMAIL_REPLY_TO', 'support@suremandarin.com'),
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
    },
  },
});

export default config;
