import { NextResponse } from "next/server";
import { STRAPI_URL } from "@/lib/auth";
const supported = new Set(["google", "linkedin", "twitter"]);
export async function GET(
  _: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  if (!supported.has(provider))
    return NextResponse.json(
      { error: "Unsupported provider." },
      { status: 404 },
    );
  return NextResponse.redirect(`${STRAPI_URL}/api/connect/${provider}`);
}
