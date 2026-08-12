import { NextResponse } from "next/server";
import { allowRequest, createPuzzleChallenge } from "@/lib/puzzle-captcha";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!allowRequest(request, "puzzle", 30, 60_000)) {
    return NextResponse.json(
      { error: "Too many verification requests." },
      { status: 429 },
    );
  }
  return NextResponse.json(createPuzzleChallenge(), {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
