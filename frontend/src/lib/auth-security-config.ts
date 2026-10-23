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

type ConfigVariable =
  | "TURNSTILE_SECRET_KEY" | "NEXT_PUBLIC_TURNSTILE_SITE_KEY" | "TURNSTILE_HOSTNAMES"
  | "UPSTASH_REDIS_REST_URL" | "UPSTASH_REDIS_REST_TOKEN" | "AUTH_RATE_LIMIT_PREFIX"
  | "AUTH_GATEWAY_SECRET" | "STRAPI_URL" | "NEXT_PUBLIC_STRAPI_URL";
export type AuthSecurityConfigIssue = { variable: ConfigVariable; reason: "missing" | "invalid" };

/** One validation source for private runtime checks and value-free build diagnostics. */
function inspectAuthSecurityConfig() {
  const env = process.env;
  const secretKey = env.TURNSTILE_SECRET_KEY?.trim() ?? "";
  const siteKey = env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const gatewaySecret = env.AUTH_GATEWAY_SECRET ?? "";
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN?.trim() ?? "";
  const prefix = env.AUTH_RATE_LIMIT_PREFIX ?? "";
  const hostnames = (env.TURNSTILE_HOSTNAMES ?? "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  const hosted = env.NODE_ENV === "production" || Boolean(env.VERCEL);
  const issues: AuthSecurityConfigIssue[] = [];
  function check(variable: ConfigVariable, present: boolean, valid: boolean) {
    if (!present) issues.push({ variable, reason: "missing" });
    else if (!valid) issues.push({ variable, reason: "invalid" });
  }
  const isKey = (value: string) => /^[a-zA-Z0-9_-]{20,200}$/.test(value)
    && !(hosted && /^[123]x0{10,}/.test(value));
  check("TURNSTILE_SECRET_KEY", Boolean(secretKey), isKey(secretKey));
  check("NEXT_PUBLIC_TURNSTILE_SITE_KEY", Boolean(siteKey), isKey(siteKey));
  check("AUTH_GATEWAY_SECRET", Boolean(gatewaySecret), /^[a-fA-F0-9]{64}$/.test(gatewaySecret));
  check("UPSTASH_REDIS_REST_TOKEN", Boolean(redisToken), Boolean(redisToken) && !/\s/.test(redisToken));
  check("AUTH_RATE_LIMIT_PREFIX", Boolean(prefix), /^[a-zA-Z0-9_-]{1,64}$/.test(prefix));
  check("TURNSTILE_HOSTNAMES", hostnames.length > 0,
    hostnames.every((v) => /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(v) && !v.includes(".."))
    && !(hosted && hostnames.some((v) => v === "localhost" || v === "127.0.0.1")));

  // Discard URL parser errors: their messages may contain credentials or query values.
  let redisUrl: URL | undefined;
  try { redisUrl = new URL(env.UPSTASH_REDIS_REST_URL ?? ""); } catch { /* Report only the variable name below. */ }
  const localRedis = redisUrl && !hosted && redisUrl.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(redisUrl.hostname);
  check("UPSTASH_REDIS_REST_URL", Boolean(env.UPSTASH_REDIS_REST_URL?.trim()), Boolean(redisUrl
    && (redisUrl.protocol === "https:" || localRedis)
    && !redisUrl.username && !redisUrl.password && !redisUrl.search && !redisUrl.hash
    && redisUrl.pathname === "/"));

  const backendVariable = env.STRAPI_URL !== undefined ? "STRAPI_URL" : env.NEXT_PUBLIC_STRAPI_URL !== undefined ? "NEXT_PUBLIC_STRAPI_URL" : "STRAPI_URL";
  const backendValue = env.STRAPI_URL ?? env.NEXT_PUBLIC_STRAPI_URL ?? "";
  let backendUrl: URL | undefined;
  try { backendUrl = new URL(backendValue); } catch { /* Report only the variable name below. */ }
  const localBackend = backendUrl && backendUrl.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(backendUrl.hostname);
  check(backendVariable, Boolean(backendValue.trim()), Boolean(backendUrl
    && (backendUrl.protocol === "https:" || localBackend)
    && !backendUrl.username && !backendUrl.password && !backendUrl.search && !backendUrl.hash
    && backendUrl.pathname === "/"));

  return { issues, config: { secretKey, siteKey, gatewaySecret, redisToken, redisUrl: redisUrl?.origin ?? "", prefix, hostnames } };
}

/** Variable names and fixed reason codes only; never includes environment values. */
export function getAuthSecurityConfigIssues(): AuthSecurityConfigIssue[] {
  return inspectAuthSecurityConfig().issues;
}

/** Detailed diagnostics are for build logs, never an account API response. */
export function assertAuthSecurityBuildConfig() {
  const issues = getAuthSecurityConfigIssues();
  if (issues.length) {
    const summary = issues.map(({ variable, reason }) => `${variable} (${reason})`).join(", ");
    throw new Error(`Account security configuration blocks this build: ${summary}. Configure valid values for this deployment environment and rebuild. No configuration values are included in this error.`);
  }
}

/** No secret defaults, JWT reuse, in-memory fallback, or environment-based bypass. */
export function getAuthSecurityConfig() {
  const { issues, config } = inspectAuthSecurityConfig();
  if (issues.length) throw securityUnavailable();
  return config;
}
