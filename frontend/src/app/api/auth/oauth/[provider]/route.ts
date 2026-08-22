import { NextResponse } from "next/server";
import { STRAPI_URL } from "@/lib/auth";

const supported = new Set(["google", "apple", "twitter"]);

const OAUTH_CONTEXT_COOKIE = "suremandarin_oauth_context";
const APPLE_FLOW_COOKIE = "suremandarin_apple_flow";

function cookieOptions(sameSite: "lax" | "none") {
  return {
    httpOnly: true,
    sameSite,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  } as const;
}

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
  const ref = url.searchParams.get("ref")?.trim().slice(0, 80) ?? "";
  const refName = url.searchParams.get("refName")?.trim().slice(0, 120) ?? "";
  const source = url.searchParams.get("source")?.trim().slice(0, 40) ?? "website";
  const context = Buffer.from(JSON.stringify({ locale, mode, ref, refName, source })).toString("base64url");

  if (provider === "apple") {
    const state = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const nonce = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    try {
      const authorizeResponse = await fetch(
        `${STRAPI_URL}/api/apple-auth/authorize?${new URLSearchParams({ state, nonce })}`,
        { headers: { Accept: "application/json" }, cache: "no-store" },
      );
      const result = await authorizeResponse.json().catch(() => null) as { url?: string } | null;
      const appleUrl = result?.url ? new URL(result.url) : null;
      if (!authorizeResponse.ok || appleUrl?.origin !== "https://appleid.apple.com") throw new Error();
      const response = NextResponse.redirect(appleUrl);
      response.cookies.set(OAUTH_CONTEXT_COOKIE, context, cookieOptions("none"));
      response.cookies.set(
        APPLE_FLOW_COOKIE,
        Buffer.from(JSON.stringify({ state, nonce })).toString("base64url"),
        cookieOptions("none"),
      );
      return response;
    } catch {
      return NextResponse.redirect(new URL(`/${locale}/${mode}?oauth=not_configured`, url.origin));
    }
  }

  const response = NextResponse.redirect(`${STRAPI_URL}/api/connect/${provider}`);
  response.cookies.set(
    OAUTH_CONTEXT_COOKIE,
    context,
    cookieOptions("lax"),
  );
  return response;
}
