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
  // The optional Releases and Review Workflows panels currently trigger an
  // admin RTK endpoint error in the Transfer Tokens screen. They are not used
  // by the SureMandarin publishing flow (draft/publish is sufficient), so keep
  // them disabled until the upstream admin bundle resolves that incompatibility.
  'content-releases': {
    enabled: false,
  },
  'review-workflows': {
    enabled: false,
  },
  email: {
    config: {
      // Render Free blocks outbound SMTP ports. Use Resend's HTTPS API on
      // port 443 instead. SMTP_PASSWORD remains as a temporary compatibility
      // fallback so the first deployment can reuse the existing Resend key.
      provider: 'suremandarin-resend',
      providerOptions: {
        apiKey: env('RESEND_API_KEY', env('SMTP_PASSWORD', '')),
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'SureMandarin <hello@suremandarin.com>'),
        defaultReplyTo: env('EMAIL_REPLY_TO', 'qingniaobird@163.com'),
      },
    },
  },
  upload: {
    config: {
      // Use durable Supabase Storage in production. Keeping the local provider
      // as a fallback makes local development work before credentials are set.
      provider: env('SUPABASE_API_URL')
        ? 'strapi-provider-upload-supabase-bucket'
        : 'local',
      providerOptions: env('SUPABASE_API_URL')
        ? {
            apiUrl: env('SUPABASE_API_URL'),
            apiKey: env('SUPABASE_API_KEY'),
            bucket: env('SUPABASE_BUCKET', 'media'),
            directory: env('SUPABASE_DIRECTORY', 'uploads'),
            publicFiles: env.bool('SUPABASE_PUBLIC_FILES', true),
            signedUrlExpires: env.int('SUPABASE_SIGNED_URL_EXPIRES', 3600),
          }
        : {},
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
      sizeLimit: 50 * 1024 * 1024,
    },
  },
});

export default config;
