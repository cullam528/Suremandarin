import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
const supported = new Set(["google", "linkedin", "twitter"]);
export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);
  if (!supported.has(provider))
    return NextResponse.redirect(new URL("/login?oauth=unsupported", url));
  if (url.searchParams.get("error"))
    return NextResponse.redirect(new URL("/login?oauth=cancelled", url));
  const response = await fetch(
    `${STRAPI_URL}/api/auth/${provider}/callback?${url.searchParams.toString()}`,
    { headers: { Accept: "application/json" }, cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok || !result.jwt)
    return NextResponse.redirect(new URL("/login?oauth=failed", url));
  await setAuthCookie(result.jwt);
  return NextResponse.redirect(new URL("/account", url));
}
