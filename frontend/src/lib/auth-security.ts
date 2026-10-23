import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { AuthSecurityError, getAuthSecurityConfig, securityUnavailable } from "./auth-security-config";

export { AuthSecurityError } from "./auth-security-config";
export type AuthAction = "login" | "register" | "forgot-password" | "reset-password";
const limits: Record<AuthAction, number> = { login: 10, register: 6, "forgot-password": 5, "reset-password": 8 };
const windowMs = 15 * 60_000;

// One atomic operation at the shared Redis writer; no read/modify/write race,
// local clock dependence, fixed-window boundary burst, or process-local state.
export const rateLimitScript = `
local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
if redis.call('ZCARD', KEYS[1]) >= limit then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return {0, math.max(1, tonumber(oldest[2]) + window - now)}
end
redis.call('ZADD', KEYS[1], now, ARGV[3])
redis.call('PEXPIRE', KEYS[1], window)
return {1, 0}
`;

async function redisCommand(command: (string | number)[]): Promise<unknown> {
  const config = getAuthSecurityConfig();
  try {
    const response = await fetch(config.redisUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(command), cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) throw securityUnavailable();
    const body = await response.json();
    if (!body || typeof body !== "object" || body.error || !("result" in body)) throw securityUnavailable();
    return body.result;
  } catch { throw securityUnavailable(); }
}

function identityKey(scope: string, value: string) {
  const config = getAuthSecurityConfig();
  // Neither IP addresses, email addresses nor reset codes are stored in Redis.
  const digest = createHmac("sha256", config.gatewaySecret).update(`${scope}\0${value}`).digest("hex");
  return `${config.prefix}:auth:${scope}:${digest}`;
}

function requestIdentity(request: Request) {
  // Vercel overwrites this header. Outside Vercel, opt in only to a header
  // overwritten by a trusted ingress that is the application's sole entrypoint.
  const header = process.env.VERCEL === "1" ? "x-vercel-forwarded-for" : process.env.AUTH_TRUSTED_IP_HEADER;
  const ip = header ? request.headers.get(header)?.trim() : undefined;
  if (!ip || !isIP(ip)) return "unknown"; // A shared bucket, never caller-supplied fallback headers.
  if (isIP(ip) === 4) return ip;
  // Canonicalize IPv6 spellings and group /64s to prevent trivial address rotation.
  const normalized = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  if (normalized.startsWith("::ffff:")) return normalized;
  const [left, right = ""] = normalized.split("::");
  const leading = left ? left.split(":") : [];
  const trailing = right ? right.split(":") : [];
  const parts = normalized.includes("::") ? [...leading, ...Array(8 - leading.length - trailing.length).fill("0"), ...trailing] : leading;
  return `${parts.slice(0, 4).join(":")}::/64`;
}

async function enforceLimit(scope: string, identity: string, limit: number) {
  const result = await redisCommand(["EVAL", rateLimitScript, "1", identityKey(scope, identity), windowMs, limit, randomUUID()]);
  if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0])
    || !Number.isFinite(result[1]) || result[1] < 0 || result[1] > windowMs) throw securityUnavailable();
  if (result[0] === 0) throw new AuthSecurityError(429, "RATE_LIMITED", "Too many attempts. Please try again later.", Math.max(1, Math.ceil(result[1] / 1000)));
}

export async function enforceIpLimit(request: Request, action: AuthAction) {
  await enforceLimit(`${action}:ip`, requestIdentity(request), limits[action]);
}

export async function enforceAccountLimit(action: AuthAction, identifier: string) {
  await enforceLimit(`${action}:account`, identifier.trim().toLowerCase(), limits[action]);
}

export async function verifyCaptcha(input: unknown, action: Exclude<AuthAction, "reset-password">) {
  const config = getAuthSecurityConfig();
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const { token, trap } = input as { token?: unknown; trap?: unknown };
  if (typeof token !== "string" || !token.trim() || token.length > 2048) return false;
  if (trap != null && (typeof trap !== "string" || trap.trim())) return false;
  let result;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: config.secretKey, response: token }),
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw securityUnavailable();
    result = await response.json();
    if (!result || typeof result.success !== "boolean") throw securityUnavailable();
    if (Array.isArray(result["error-codes"]) && result["error-codes"].some((code: string) =>
      ["missing-input-secret", "invalid-input-secret", "internal-error"].includes(code))) throw securityUnavailable();
  } catch { throw securityUnavailable(); }
  const issuedAt = typeof result.challenge_ts === "string" ? Date.parse(result.challenge_ts) : NaN;
  if (result.success !== true || result.action !== action
    || typeof result.hostname !== "string" || !config.hostnames.includes(result.hostname.toLowerCase())
    || !Number.isFinite(issuedAt) || issuedAt > Date.now() || Date.now() - issuedAt >= 300_000) return false;
  // Siteverify tokens are already single-use globally. A shared atomic claim also
  // blocks concurrent duplicate acceptance at the application boundary.
  const digest = createHash("sha256").update(token).digest("hex");
  const claimed = await redisCommand(["SET", `${config.prefix}:auth:captcha:${digest}`, "1", "NX", "EX", 300]);
  if (claimed !== "OK" && claimed !== null) throw securityUnavailable();
  return claimed === "OK";
}

export function authGatewayHeaders(request: Request): Record<string, string> {
  const identity = requestIdentity(request);
  return {
    "x-auth-gateway-secret": getAuthSecurityConfig().gatewaySecret,
    ...(identity !== "unknown" ? { "x-auth-client-ip": identity.replace(/\/64$/, "") } : {}),
  };
}

export function securityErrorResponse(error: unknown) {
  if (!(error instanceof AuthSecurityError)) return null;
  return Response.json({ error: error.message, code: error.code }, {
    status: error.status,
    headers: { "Cache-Control": "no-store", ...(error.retryAfter ? { "Retry-After": String(error.retryAfter) } : {}) },
  });
}

export async function readAuthBody(request: Request): Promise<Record<string, unknown>> {
  const bad = () => new AuthSecurityError(400, "INVALID_REQUEST", "Please check the submitted fields.");
  // Stream the small auth payload with an actual byte cap, including chunked requests.
  const reader = request.body?.getReader();
  if (!reader) throw bad();
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16_384) { await reader.cancel(); throw bad(); }
      chunks.push(value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw bad();
    return value;
  } catch { throw bad(); }
  finally { reader.releaseLock(); }
}

export function validText(value: unknown, maximum = 254): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
}
