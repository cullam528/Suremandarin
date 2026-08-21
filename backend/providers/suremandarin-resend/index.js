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

function copyOptionalFields(source, target) {
  for (const field of optionalFields) {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  }
}

module.exports = {
  init(providerOptions = {}, settings = {}) {
    const apiKey = providerOptions.apiKey;
    const resend = apiKey ? new Resend(apiKey) : null;

    return {
      async send(options = {}) {
        if (!resend) {
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

        const { data, error } = await resend.emails.send(message);

        if (error) {
          const resendError = new Error(
            error.message || 'Resend rejected the email request.',
          );
          if (typeof error.statusCode === 'number') {
            resendError.statusCode = error.statusCode;
          }
          throw resendError;
        }

        return data;
      },

      getCapabilities() {
        return {
          features: ['HTTPS API (port 443)'],
        };
      },
    };
  },
};
