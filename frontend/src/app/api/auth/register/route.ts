import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { enforceIpLimit, enforceAccountLimit, verifyCaptcha, authGatewayHeaders, securityErrorResponse, readAuthBody, validText } from "@/lib/auth-security";

export async function POST(request: Request) {
  try {
    await enforceIpLimit(request, "register");
    const { fullName, email, password, marketingConsent, privacyConsent, sourceChannel, captcha } =
      await readAuthBody(request);
    if (!validText(fullName, 200) || !validText(email) || !validText(password, 1024) || privacyConsent !== true)
      return NextResponse.json(
        { error: "Please complete all required fields." },
        { status: 400 },
      );
    if (String(password).length < 8)
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 },
      );
    if (!await verifyCaptcha(captcha, "register")) return NextResponse.json(
      { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" }, { status: 400 },
    );
    await enforceAccountLimit("register", email);
    const allowedSources = new Set(["website", "whatsapp", "facebook", "email", "miniprogram", "ios", "android", "other"]);
    const registrationSource = allowedSources.has(String(sourceChannel))
      ? String(sourceChannel)
      : "website";
    const response = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: "POST",
      headers: { ...authGatewayHeaders(request),
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
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json();
    if (!response.ok)
      return NextResponse.json(
        { error: result?.error?.message ?? "Registration was not completed." },
        { status: response.status },
      );
    const hasSession = typeof result.jwt === "string" && result.jwt.length > 0;
    if (hasSession) await setAuthCookie(result.jwt);
    return NextResponse.json({ user: result.user, requiresEmailConfirmation: !hasSession });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: "Unable to register. Please try again." },
      { status: 500 },
    );
  }
}
