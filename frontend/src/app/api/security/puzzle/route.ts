import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "Security verification has changed. Please reload the page.", code: "CAPTCHA_RETIRED" },
    { status: 410, headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
