import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { posix } from 'node:path';
import type { Core } from '@strapi/strapi';

const protectedActions = [
  '/auth/local',
  '/auth/local/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/send-email-confirmation',
];
const secretPattern = /^[0-9a-fA-F]{64}$/;

// Koa's router is case-insensitive and permits a trailing slash. Decode and
// normalize conservatively so aliases cannot skip the gate after proxy routing.
// This only determines protection; it does not rewrite the request path.
function canonicalPath(path: string): string {
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    // Malformed escapes cannot match a valid Strapi route. Keep the raw path.
  }
  return posix.normalize(decoded.replace(/\\/g, '/')).replace(/\/+$/, '').toLowerCase();
}

/**
 * Only the Next.js server can call native local-account endpoints. It verifies
 * CAPTCHA and shared rate limits first. Never expose this header to browsers,
 * mobile apps, or logs, and never reuse a JWT or CAPTCHA secret here.
 */
const authGateway: Core.MiddlewareFactory = (_config, { strapi }) => {
  const secret = process.env.AUTH_GATEWAY_SECRET;
  const configured = typeof secret === 'string' && secretPattern.test(secret);
  if (process.env.NODE_ENV === 'production' && !configured) {
    throw new Error('AUTH_GATEWAY_SECRET must be configured as 64 hexadecimal characters before starting Strapi.');
  }
  const expected = configured ? Buffer.from(secret, 'utf8') : undefined;
  const prefix = strapi.config.get<string>('api.rest.prefix', '/api');
  const protectedPaths = new Set(protectedActions.map((action) => canonicalPath(`${prefix}${action}`)));
  // Strapi's generic provider callback also dispatches provider=local to the
  // password controller. Keep that alias closed without blocking real OAuth.
  const localCallback = canonicalPath(`${prefix}/auth/local/callback`);

  return async (ctx, next) => {
    const path = canonicalPath(ctx.path);
    const protectedRequest = (ctx.method === 'POST' && protectedPaths.has(path))
      || ((ctx.method === 'GET' || ctx.method === 'HEAD') && path === localCallback);
    if (!protectedRequest) {
      return next();
    }

    ctx.set('Cache-Control', 'no-store');
    if (!expected) {
      ctx.status = 503;
      ctx.body = { data: null, error: { status: 503, name: 'ServiceUnavailableError', message: 'Account service is temporarily unavailable.' } };
      return;
    }

    const supplied = ctx.get('x-auth-gateway-secret');
    // Reject malformed or duplicate (comma-joined) headers before comparing
    // fixed-length buffers. No secret or supplied value appears in errors.
    if (!secretPattern.test(supplied) || !timingSafeEqual(expected, Buffer.from(supplied, 'utf8'))) {
      ctx.status = 403;
      ctx.body = { data: null, error: { status: 403, name: 'ForbiddenError', message: 'Use the website account endpoint for this request.' } };
      return;
    }

    // The authenticated frontend derives this from its trusted ingress header.
    // Koa's supported ip setter keeps Strapi's existing per-IP limiter from
    // merging unrelated members behind one Vercel egress address. Never accept
    // this assertion before validating the gateway or on unrelated routes.
    const clientIp = ctx.get('x-auth-client-ip');
    if (isIP(clientIp)) ctx.request.ip = clientIp;

    return next();
  };
};

export default authGateway;
