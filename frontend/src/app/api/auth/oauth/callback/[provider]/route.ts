import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { isOAuthAttempt, oauthContextCookie, readOAuthContext, type OAuthContext } from "@/lib/oauth-context";

const supported = new Set(["google", "linkedin", "twitter"]);

type AuthResult = {
  jwt?: string;
  error?: { message?: string };
};

function authPageUrl(origin: string, context: Pick<OAuthContext, "locale" | "mode"> & Partial<OAuthContext>, reason: string) {
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
  const fallback = { locale: "en", mode: "login" } as const;
  if (!supported.has(provider))
    return NextResponse.redirect(authPageUrl(url.origin, fallback, "unsupported"));
  const attempt = url.searchParams.get("oauthAttempt");
  if (!isOAuthAttempt(attempt) || url.searchParams.getAll("oauthAttempt").length !== 1)
    return NextResponse.redirect(authPageUrl(url.origin, fallback, "failed"));
  const cookieStore = await cookies();
  const cookieName = oauthContextCookie(attempt);
  const context = readOAuthContext(cookieStore.get(cookieName)?.value);
  if (!context) {
    cookieStore.delete(cookieName);
    return NextResponse.redirect(authPageUrl(url.origin, fallback, "failed"));
  }
  if (context.provider !== provider)
    return NextResponse.redirect(authPageUrl(url.origin, fallback, "failed"));
  cookieStore.delete(cookieName);
  if (url.searchParams.get("error"))
    return NextResponse.redirect(authPageUrl(
      url.origin,
      context,
      url.searchParams.get("error") === "access_denied" ? "cancelled" : "failed",
    ));

  try {
    // Provider callback URLs are untrusted. Invitation data comes only from
    // the context saved when registration started and is applied by Strapi
    // only when the verified provider identity creates a new member.
    const providerQuery = new URLSearchParams(url.searchParams);
    providerQuery.delete("oauthAttempt");
    for (const key of ["ref", "refName", "referralCode", "referredByCode", "referrer", "referrerId", "referredUser", "referredUserId", "referee", "refereeId", "referralSource", "source", "registrationSource", "mode"]) {
      providerQuery.delete(key);
    }
    if (context.mode === "register") {
      providerQuery.set("mode", "register");
      const invitationCode = context.ref?.trim() ?? "";
      if (invitationCode && invitationCode.length <= 80) {
        providerQuery.set("referredByCode", invitationCode);
        const allowedSources = new Set(["website", "whatsapp", "facebook", "email", "miniprogram", "ios", "android", "other"]);
        providerQuery.set("referralSource", allowedSources.has(context.source ?? "") ? context.source! : "website");
      }
    }
    const response = await fetch(
      `${STRAPI_URL}/api/auth/${provider}/callback?${providerQuery.toString()}`,
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
