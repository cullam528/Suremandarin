import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { STRAPI_URL } from "@/lib/auth";
import { isOAuthAttempt, oauthContextCookie, readOAuthContext, OAUTH_CONTEXT_PREFIX, OAUTH_CONTEXT_TTL_SECONDS, OAUTH_MAX_ATTEMPTS } from "@/lib/oauth-context";

const supported = new Set(["google", "linkedin", "twitter"]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!supported.has(provider))
    return NextResponse.json(
      { error: "Unsupported provider." },
      { status: 404 },
    );

  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "zh" ? "zh" : "en";
  const mode = url.searchParams.get("mode") === "register" ? "register" : "login";
  const invitation = mode === "register" ? url.searchParams.get("ref")?.trim() ?? "" : "";
  const ref = invitation.length <= 80 ? invitation : "";
  const refName = url.searchParams.get("refName")?.trim().slice(0, 120) ?? "";
  const source = url.searchParams.get("source")?.trim().slice(0, 40) ?? "website";
  const attempt = randomBytes(24).toString("hex");
  const context = Buffer.from(JSON.stringify({ provider, locale, mode, ref, refName, source, expiresAt: Date.now() + OAUTH_CONTEXT_TTL_SECONDS * 1000 })).toString("base64url");

  const callback = new URL(`/api/auth/oauth/callback/${provider}`, url.origin);
  callback.searchParams.set("oauthAttempt", attempt);
  const connect = new URL(`${STRAPI_URL}/api/connect/${provider}`);
  connect.searchParams.set("callback", callback.toString());
  const response = NextResponse.redirect(connect);
  const cookieStore = await cookies();
  const pending = cookieStore.getAll().filter(({ name }) => name.startsWith(OAUTH_CONTEXT_PREFIX)
    && isOAuthAttempt(name.slice(OAUTH_CONTEXT_PREFIX.length)))
    .map((cookie, index) => ({ ...cookie, index, context: readOAuthContext(cookie.value) }));
  const retained = new Set(pending.filter((cookie) => cookie.context)
    .sort((a, b) => b.context!.expiresAt - a.context!.expiresAt || b.index - a.index)
    .slice(0, OAUTH_MAX_ATTEMPTS - 1).map(({ name }) => name));
  for (const { name } of pending) if (!retained.has(name)) response.cookies.delete(name);
  if (cookieStore.get("suremandarin_oauth_context")) response.cookies.delete("suremandarin_oauth_context");
  response.cookies.set(
    oauthContextCookie(attempt),
    context,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: OAUTH_CONTEXT_TTL_SECONDS,
    },
  );
  return response;
}
