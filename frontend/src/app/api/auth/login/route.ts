import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { allowRequest, verifyPuzzleProof } from "@/lib/puzzle-captcha";

export async function POST(request: Request) {
  try {
    if (!allowRequest(request, "login", 10, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many sign-in attempts. Please try again later." },
        { status: 429 },
      );
    }
    const { identifier, password, captcha } = await request.json();
    if (!verifyPuzzleProof(captcha)) {
      return NextResponse.json(
        { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" },
        { status: 400 },
      );
    }
    if (!identifier || !password)
      return NextResponse.json(
        { error: "Please enter your email and password." },
        { status: 400 },
      );
    const response = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ identifier, password }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return NextResponse.json(
        { error: result?.error?.message ?? "Incorrect email or password." },
        { status: response.status },
      );
    await setAuthCookie(result.jwt);
    return NextResponse.json({ user: result.user });
  } catch {
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
