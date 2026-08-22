import { randomUUID } from 'node:crypto';
import { buildAppleAuthorizeUrl, exchangeAppleAuthorizationCode, verifyAppleIdentityToken } from '../services/apple-auth';

function bounded(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

function safeUser(user: Record<string, any>) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    displayName: user.displayName,
    provider: user.provider,
    membershipLevel: user.membershipLevel,
  };
}

export default {
  async authorize(ctx: any) {
    const state = bounded(ctx.query?.state, 160);
    const nonce = bounded(ctx.query?.nonce, 160);
    if (state.length < 20 || nonce.length < 20) return ctx.badRequest('Invalid Apple sign-in request.');
    try {
      ctx.body = { url: buildAppleAuthorizeUrl(state, nonce) };
    } catch (error) {
      strapi.log.warn(`Apple sign-in configuration error: ${error instanceof Error ? error.message : String(error)}`);
      return ctx.serviceUnavailable('Apple sign-in is not configured.');
    }
  },

  async exchange(ctx: any) {
    const code = bounded(ctx.request.body?.code, 4096);
    const nonce = bounded(ctx.request.body?.nonce, 160);
    const fullName = bounded(ctx.request.body?.fullName, 160);
    if (!code || nonce.length < 20) return ctx.badRequest('Invalid Apple authorization response.');
    try {
      const identityToken = await exchangeAppleAuthorizationCode(code);
      await verifyAppleIdentityToken(identityToken, nonce);
      const providers = strapi.plugin('users-permissions').service('providers');
      const user = await providers.connect('apple', {
        access_token: identityToken,
        fullName,
        nonce,
      });
      if (user.blocked) return ctx.forbidden('Your account has been blocked by an administrator.');

      const refresh = await strapi.sessionManager('users-permissions').generateRefreshToken(
        String(user.id),
        randomUUID(),
        { type: 'refresh' },
      );
      const access = await strapi.sessionManager('users-permissions').generateAccessToken(refresh.token);
      if ('error' in access) throw new Error('Unable to create the member session.');
      ctx.body = { jwt: access.token, user: safeUser(user) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      strapi.log.warn(`Apple sign-in failed: ${message}`);
      return ctx.badRequest(message);
    }
  },
};
