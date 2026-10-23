export class AuthSecurityError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) { super(message); }
}

export function securityUnavailable() {
  return new AuthSecurityError(503, "SECURITY_UNAVAILABLE", "Security verification is temporarily unavailable. Please try again later.");
}

/** No secret defaults, JWT reuse, in-memory fallback, or environment-based bypass. */
export function getAuthSecurityConfig() {
  const env = process.env;
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const gatewaySecret = env.AUTH_GATEWAY_SECRET ?? "";
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  const prefix = env.AUTH_RATE_LIMIT_PREFIX ?? "";
  const hostnames = (env.TURNSTILE_HOSTNAMES ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const hosted = env.NODE_ENV === "production" || Boolean(env.VERCEL);
  let redisUrl: URL;
  try { redisUrl = new URL(env.UPSTASH_REDIS_REST_URL ?? ""); } catch { throw securityUnavailable(); }
  let backendUrl: URL;
  try { backendUrl = new URL(env.STRAPI_URL ?? env.NEXT_PUBLIC_STRAPI_URL ?? ""); } catch { throw securityUnavailable(); }
  const localBackend = backendUrl.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(backendUrl.hostname);
  const localRedis = !hosted && redisUrl.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(redisUrl.hostname);
  if (!/^[a-zA-Z0-9_-]{20,200}$/.test(secretKey)
    || !/^[a-zA-Z0-9_-]{20,200}$/.test(siteKey)
    || (hosted && [secretKey, siteKey].some((v) => /^[123]x0{10,}/.test(v)))
    || !/^[a-fA-F0-9]{64}$/.test(gatewaySecret)
    || !redisToken || /\s/.test(redisToken)
    || !/^[a-zA-Z0-9_-]{1,64}$/.test(prefix)
    || !hostnames.length || hostnames.some((v) => !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(v) || v.includes(".."))
    || (hosted && hostnames.some((v) => v === "localhost" || v === "127.0.0.1"))
    || (redisUrl.protocol !== "https:" && !localRedis)
    || redisUrl.username || redisUrl.password || redisUrl.search || redisUrl.hash
    || redisUrl.pathname !== "/"
    || (backendUrl.protocol !== "https:" && !localBackend)
    || backendUrl.username || backendUrl.password || backendUrl.search || backendUrl.hash
    || backendUrl.pathname !== "/") throw securityUnavailable();
  return { secretKey, siteKey, gatewaySecret, redisToken, redisUrl: redisUrl.origin, prefix, hostnames };
}
