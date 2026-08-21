import { NextResponse } from "next/server";
import { STRAPI_URL } from "@/lib/auth";

const supported = new Set(["google", "linkedin", "twitter"]);

const OAUTH_CONTEXT_COOKIE = "suremandarin_oauth_context";

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
  const response = NextResponse.redirect(`${STRAPI_URL}/api/connect/${provider}`);
  response.cookies.set(
    OAUTH_CONTEXT_COOKIE,
    Buffer.from(JSON.stringify({ locale, mode, ref, refName, source })).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 10 * 60,
    },
  );
  return response;
}
