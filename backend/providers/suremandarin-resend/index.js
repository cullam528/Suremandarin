'use strict';

const { Resend } = require('resend');

const optionalFields = [
  'cc',
  'bcc',
  'attachments',
  'headers',
  'tags',
  'scheduledAt',
];

function normalizeApiKey(value) {
  if (typeof value !== 'string') {
    return '';
  }

  let key = value.trim();
  for (let pass = 0; pass < 2; pass += 1) {
    const first = key[0];
    const last = key[key.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      key = key.slice(1, -1).trim();
    }
    key = key.replace(/^Bearer\s+/i, '').trim();
  }

  return key;
}

function isAuthenticationError(error) {
  const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
  const message = String(error?.message ?? '').toLowerCase();
  return statusCode === 401
    || message.includes('missing or invalid credentials')
    || message.includes('invalid api key')
    || message.includes('unauthorized');
}

function createProviderError(error) {
  const resendError = new Error(
    error?.message || 'Resend rejected the email request.',
  );
  const statusCode = Number(error?.statusCode ?? error?.status ?? 0);
  if (statusCode) {
    resendError.statusCode = statusCode;
  }
  return resendError;
}

function createCredentialError(sources) {
  const sourceList = sources.length ? sources.join(' or ') : 'RESEND_API_KEY';
  const error = new Error(
    `Resend API authentication failed. Check ${sourceList} in the Render backend service.`,
  );
  error.statusCode = 401;
  return error;
}

function copyOptionalFields(source, target) {
  for (const field of optionalFields) {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  }
}

module.exports = {
  init(providerOptions = {}, settings = {}) {
    const rawCredentials = [
      {
        key: normalizeApiKey(providerOptions.apiKey),
        source: providerOptions.apiKeySource || 'RESEND_API_KEY',
      },
      {
        key: normalizeApiKey(providerOptions.legacyApiKey),
        source: providerOptions.legacyApiKeySource || 'SMTP_PASSWORD',
      },
    ];
    const credentials = rawCredentials
      .filter((credential) => credential.key)
      .filter((credential, index, items) => (
        items.findIndex((item) => item.key === credential.key) === index
      ))
      .map((credential) => ({
        ...credential,
        client: new Resend(credential.key),
      }));

    async function verifyCredential(credential) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credential.key}`,
          'Content-Type': 'application/json',
        },
        // An intentionally incomplete payload validates authentication without
        // creating or delivering an email. Valid credentials receive a normal
        // request-validation response; invalid credentials receive 401.
        body: '{}',
      });
      const payload = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return false;
      }
      if (response.status === 403) {
        throw createProviderError({
          statusCode: 403,
          message: payload?.message || `Resend key from ${credential.source} has no sending permission.`,
        });
      }
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return true;
      }

      throw createProviderError({
        statusCode: response.status,
        message: payload?.message || `Resend credential check failed with HTTP ${response.status}.`,
      });
    }

    return {
      async send(options = {}) {
        if (!credentials.length) {
          throw new Error(
            'Resend API key is missing. Set RESEND_API_KEY in the backend environment.',
          );
        }

        const message = {
          from: options.from || settings.defaultFrom,
          to: options.to,
          subject: options.subject,
        };

        const replyTo = options.replyTo || settings.defaultReplyTo;
        if (replyTo) {
          message.replyTo = replyTo;
        }
        if (options.html !== undefined) {
          message.html = options.html;
        }
        if (options.text !== undefined) {
          message.text = options.text;
        }

        copyOptionalFields(options, message);

        for (let index = 0; index < credentials.length; index += 1) {
          const credential = credentials[index];
          const { data, error } = await credential.client.emails.send(message);

          if (!error) {
            return data;
          }
          if (isAuthenticationError(error) && index < credentials.length - 1) {
            continue;
          }
          if (isAuthenticationError(error)) {
            throw createCredentialError(credentials.map((item) => item.source));
          }
          throw createProviderError(error);
        }

        throw createCredentialError(credentials.map((item) => item.source));
      },

      async verify() {
        if (!credentials.length) {
          throw new Error(
            'Resend API key is missing. Set RESEND_API_KEY in the backend environment.',
          );
        }

        for (const credential of credentials) {
          if (await verifyCredential(credential)) {
            return true;
          }
        }

        throw createCredentialError(credentials.map((item) => item.source));
      },

      getCapabilities() {
        return {
          features: [
            'HTTPS API (port 443)',
            credentials.length
              ? `Credential source: ${credentials.map((item) => item.source).join(' + ')}`
              : 'Credential source: missing',
          ],
        };
      },
    };
  },
};
