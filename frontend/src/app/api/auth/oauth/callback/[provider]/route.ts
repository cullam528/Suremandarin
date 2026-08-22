import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";

const supported = new Set(["google", "facebook", "twitter"]);

const OAUTH_CONTEXT_COOKIE = "suremandarin_oauth_context";

type OAuthContext = {
  locale: "en" | "zh";
  mode: "login" | "register";
  ref?: string;
  refName?: string;
  source?: string;
};

type AuthResult = {
  jwt?: string;
  error?: { message?: string };
};

function readOAuthContext(value?: string): OAuthContext {
  if (!value) return { locale: "en", mode: "login" };
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<OAuthContext>;
    return {
      locale: parsed.locale === "zh" ? "zh" : "en",
      mode: parsed.mode === "register" ? "register" : "login",
      ref: typeof parsed.ref === "string" ? parsed.ref : "",
      refName: typeof parsed.refName === "string" ? parsed.refName : "",
      source: typeof parsed.source === "string" ? parsed.source : "website",
    };
  } catch {
    return { locale: "en", mode: "login" };
  }
}

function authPageUrl(origin: string, context: OAuthContext, reason: string) {
  const target = new URL(`/${context.locale}/${context.mode}`, origin);
  target.searchParams.set("oauth", reason);
  if (context.mode === "register" && context.ref) target.searchParams.set("ref", context.ref);
  if (context.mode === "register" && context.refName) target.searchParams.set("refName", context.refName);
  if (context.mode === "register" && context.source) target.searchParams.set("source", context.source);
  return target;
}

function failureReason(result: AuthResult | null) {
  const message = result?.error?.message?.toLowerCase() ?? "";
  return message.includes("email was not available") || message.includes("did not return an email")
    ? "missing_email"
    : message.includes("email is already taken")
      ? "account_exists"
      : "failed";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const cookieStore = await cookies();
  const context = readOAuthContext(cookieStore.get(OAUTH_CONTEXT_COOKIE)?.value);
  cookieStore.delete(OAUTH_CONTEXT_COOKIE);
  if (!supported.has(provider))
    return NextResponse.redirect(authPageUrl(url.origin, context, "unsupported"));
  if (url.searchParams.get("error"))
    return NextResponse.redirect(authPageUrl(
      url.origin,
      context,
      url.searchParams.get("error") === "access_denied" ? "cancelled" : "failed",
    ));

  try {
    const response = await fetch(
      `${STRAPI_URL}/api/auth/${provider}/callback?${url.searchParams.toString()}`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );
    const result = await response.json().catch(() => null) as AuthResult | null;
    if (!response.ok || !result?.jwt) {
      return NextResponse.redirect(authPageUrl(url.origin, context, failureReason(result)));
    }
    await setAuthCookie(result.jwt);
    return NextResponse.redirect(new URL(`/${context.locale}/account/profile`, url.origin));
  } catch {
    return NextResponse.redirect(authPageUrl(url.origin, context, "failed"));
  }
}
