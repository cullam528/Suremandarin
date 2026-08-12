import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { allowRequest, verifyPuzzleProof } from "@/lib/puzzle-captcha";

export async function POST(request: Request) {
  try {
    if (!allowRequest(request, "register", 6, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }
    const { fullName, email, password, marketingConsent, privacyConsent, sourceChannel, captcha } =
      await request.json();
    if (!verifyPuzzleProof(captcha)) {
      return NextResponse.json(
        { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" },
        { status: 400 },
      );
    }
    if (!fullName || !email || !password || privacyConsent !== true)
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 },
      );
    if (String(password).length < 8)
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 },
      );
    const allowedSources = new Set(["website", "whatsapp", "facebook", "email", "miniprogram", "ios", "android", "other"]);
    const registrationSource = allowedSources.has(String(sourceChannel))
      ? String(sourceChannel)
      : "website";
    const response = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: String(email).trim().toLowerCase(),
        email: String(email).trim().toLowerCase(),
        password,
        fullName: String(fullName).trim(),
        displayName: String(fullName).trim(),
        registrationSource,
        registrationPlatform: "web",
        preferredLanguage: "en",
        marketingConsent: Boolean(marketingConsent),
        privacyPolicyVersion: "2026-08",
        privacyConsentAt: new Date().toISOString(),
      }),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return NextResponse.json(
        { error: result?.error?.message ?? "Registration was not completed." },
        { status: response.status },
      );
    await setAuthCookie(result.jwt);
    return NextResponse.json({ user: result.user });
  } catch {
    return NextResponse.json(
      { error: "Unable to register. Please try again." },
      { status: 500 },
    );
  }
}
