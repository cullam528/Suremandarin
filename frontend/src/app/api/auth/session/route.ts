import { NextResponse } from "next/server";
import { clearAuthCookie, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    await clearAuthCookie();
    return NextResponse.json(
      { user: null },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
  return NextResponse.json(
    { user },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
