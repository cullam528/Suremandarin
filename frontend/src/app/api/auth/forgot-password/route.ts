import { NextResponse } from "next/server";
import { STRAPI_URL } from "@/lib/auth";
import { allowRequest, verifyPuzzleProof } from "@/lib/puzzle-captcha";

export async function POST(request: Request) {
  try {
    if (!allowRequest(request, "forgot-password", 5, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please try again later." },
        { status: 429 },
      );
    }
    const { email, captcha } = await request.json();
    if (!verifyPuzzleProof(captcha)) {
      return NextResponse.json(
        { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" },
        { status: 400 },
      );
    }
    if (!email) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }
    const response = await fetch(`${STRAPI_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: String(email).trim().toLowerCase() }),
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Password reset email is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Password reset email is temporarily unavailable." },
      { status: 503 },
    );
  }
}
