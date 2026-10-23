export const OAUTH_CONTEXT_PREFIX = "suremandarin_oauth_";
export const OAUTH_CONTEXT_TTL_SECONDS = 10 * 60;
export const OAUTH_MAX_ATTEMPTS = 3;

export type OAuthContext = {
  provider: "google" | "linkedin" | "twitter";
  locale: "en" | "zh";
  mode: "login" | "register";
  ref: string;
  refName: string;
  source: string;
  expiresAt: number;
};

export const isOAuthAttempt = (value: string | null): value is string =>
  typeof value === "string" && /^[a-f0-9]{48}$/.test(value);

export const oauthContextCookie = (attempt: string) => `${OAUTH_CONTEXT_PREFIX}${attempt}`;

export function readOAuthContext(value?: string): OAuthContext | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OAuthContext;
    if (!parsed || !["google", "linkedin", "twitter"].includes(parsed.provider)
      || !["en", "zh"].includes(parsed.locale) || !["login", "register"].includes(parsed.mode)
      || typeof parsed.ref !== "string" || parsed.ref.length > 80
      || typeof parsed.refName !== "string" || parsed.refName.length > 120
      || typeof parsed.source !== "string" || parsed.source.length > 40
      || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()
      || parsed.expiresAt > Date.now() + OAUTH_CONTEXT_TTL_SECONDS * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}
