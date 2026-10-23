const PROVIDERS = new Set(['google', 'linkedin', 'twitter']);
const ATTEMPT_PATTERN = /^[a-f0-9]{48}$/;
const SESSION_KEY = 'smOAuthAttempts';
const TTL = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;
// koa-session stores the whole session in a signed browser cookie. Leave room
// for the legacy grant and cookie encoding/signature. Retain only the OAuth1
// request secret needed for exchange, never completed access-token responses.
const MAX_ATTEMPT_BYTES = 1800;
const MAX_SESSION_BYTES = 2600;

type Attempt = {
  p: string;
  exp: number;
  c: string;
  s?: string;
  r?: { oauth_token: string; oauth_token_secret: string };
};
type Attempts = Record<string, Attempt>;

function text(value: unknown, max = 512): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max;
}

function pending(session: any): Attempts {
  const raw = session[SESSION_KEY];
  const now = Date.now();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return Object.fromEntries(Object.entries(raw).filter(([id, item]) => {
    const value = item as Attempt;
    return ATTEMPT_PATTERN.test(id) && value && PROVIDERS.has(value.p)
      && Number.isFinite(value.exp) && value.exp > now && value.exp <= now + TTL
      && text(value.c, 1024) && (text(value.s) || (text(value.r?.oauth_token) && text(value.r?.oauth_token_secret)));
  })) as Attempts;
}

function save(session: any, attempts: Attempts) {
  const ordered = Object.entries(attempts).sort((a, b) => a[1].exp - b[1].exp);
  while (ordered.length > MAX_ATTEMPTS) ordered.shift();
  let kept = Object.fromEntries(ordered);
  const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), 'utf8');
  while (ordered.length && (bytes(kept) > MAX_ATTEMPT_BYTES
    || bytes({ ...session, [SESSION_KEY]: kept }) > MAX_SESSION_BYTES)) {
    ordered.shift();
    kept = Object.fromEntries(ordered);
  }
  if (ordered.length) session[SESSION_KEY] = kept;
  else delete session[SESSION_KEY];
}

function matches(provider: string, grant: any, query: any) {
  if (grant?.provider !== provider) return false;
  if (provider === 'twitter') {
    return text(grant.request?.oauth_token) && text(query.oauth_token)
      && grant.request.oauth_token === query.oauth_token;
  }
  return text(grant.state) && text(query.state) && grant.state === query.state;
}

function restoreGrant(attempt: Attempt) {
  return {
    provider: attempt.p,
    dynamic: { callback: attempt.c },
    ...(attempt.s ? { state: attempt.s } : { request: attempt.r }),
  };
}

// Keep Strapi's original state/token validation and provider exchange intact.
// The wrapper only selects the exact pending grant and preserves its opaque
// frontend context identifier, which Strapi otherwise removes from the redirect.
export function withOAuthAttempt(strapi: any, connect: (ctx: any, next: any) => Promise<any>) {
  return async (ctx: any, next: any) => {
    const path = String(ctx.request.url).split('?')[0];
    const match = path.match(/\/connect\/([^/]+)(\/callback)?\/?$/);
    if (!match || !PROVIDERS.has(match[1]) || !ctx.session) return connect(ctx, next);
    const provider = match[1];
    const isCallback = Boolean(match[2]);
    const stored = await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'grant' }).get();
    const providerConfig = stored?.[provider];
    if (!providerConfig?.enabled) return connect(ctx, next);
    const validate = strapi.plugin('users-permissions').config('callback').validate;
    const attempts = pending(ctx.session);
    save(ctx.session, attempts);
    const fail = () => {
      const target = new URL(providerConfig.callback);
      target.search = '';
      target.hash = '';
      target.searchParams.set('error', 'oauth_error');
      return ctx.redirect(target.toString());
    };

    if (!isCallback) {
      const custom = ctx.query.callback;
      if (typeof custom !== 'string') return connect(ctx, next);
      let target: URL;
      try { target = new URL(custom); } catch { return connect(ctx, next); }
      if (!target.searchParams.has('oauthAttempt')) return connect(ctx, next);
      await validate(custom, providerConfig);
      const id = target.searchParams.get('oauthAttempt') ?? '';
      if (!ATTEMPT_PATTERN.test(id) || target.searchParams.getAll('oauthAttempt').length !== 1 || attempts[id]) return fail();
      target.search = '';
      target.hash = '';
      target.username = '';
      target.password = '';
      target.searchParams.set('oauthAttempt', id);
      const legacy = ctx.session.grant;
      const oldQuery = ctx.query;
      ctx.session.grant = {};
      ctx.query = { ...oldQuery, callback: target.toString() };
      try {
        const result = await connect(ctx, next);
        const grant = ctx.session.grant;
        const attempt: Attempt = { p: provider, exp: Date.now() + TTL, c: target.toString() };
        if (provider === 'twitter' && text(grant?.request?.oauth_token) && text(grant?.request?.oauth_token_secret)) {
          attempt.r = { oauth_token: grant.request.oauth_token, oauth_token_secret: grant.request.oauth_token_secret };
        } else if (provider !== 'twitter' && text(grant?.state)) attempt.s = grant.state;
        else return fail();
        attempts[id] = attempt;
        return result;
      } finally {
        if (legacy === undefined) delete ctx.session.grant;
        else ctx.session.grant = legacy;
        ctx.query = oldQuery;
        save(ctx.session, attempts);
      }
    }

    // Provider callbacks must not choose a different same-origin dynamic callback.
    if (ctx.query.callback !== undefined) return fail();
    const found = Object.entries(attempts).find(([, attempt]) => matches(provider, restoreGrant(attempt), ctx.query));
    if (!found) {
      // A missing/evicted/overwritten attempt fails closed. Never call the native
      // middleware with another flow's grant, including on cancellation errors.
      if (!matches(provider, ctx.session.grant, ctx.query)) return fail();
      return connect(ctx, next);
    }
    const [id, attempt] = found;
    await validate(attempt.c, providerConfig);
    delete attempts[id];
    const legacy = ctx.session.grant;
    const redirect = ctx.redirect;
    const target = new URL(attempt.c);
    ctx.session.grant = restoreGrant(attempt);
    ctx.redirect = function (value: string, ...args: any[]) {
      const location = new URL(value, target.origin);
      if (location.origin === target.origin && location.pathname === target.pathname) {
        location.searchParams.set('oauthAttempt', id);
        return redirect.call(this, location.toString(), ...args);
      }
      return redirect.call(this, value, ...args);
    };
    try { return await connect(ctx, next); } finally {
      ctx.redirect = redirect;
      if (legacy === undefined) delete ctx.session.grant;
      else ctx.session.grant = legacy;
      save(ctx.session, attempts);
    }
  };
}
