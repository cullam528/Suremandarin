import { NextResponse } from "next/server";
import { STRAPI_URL } from "@/lib/auth";
import { enforceIpLimit, enforceAccountLimit, verifyCaptcha, authGatewayHeaders, securityErrorResponse, readAuthBody, validText } from "@/lib/auth-security";

export async function POST(request: Request) {
  try {
    await enforceIpLimit(request, "forgot-password");
    const { email, captcha } = await readAuthBody(request);
    if (!validText(email)) {
      return NextResponse.json({ error: "Please enter your email address." }, { status: 400 });
    }
    if (!await verifyCaptcha(captcha, "forgot-password")) return NextResponse.json(
      { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" }, { status: 400 },
    );
    await enforceAccountLimit("forgot-password", email);
    const response = await fetch(`${STRAPI_URL}/api/auth/forgot-password`, {
      method: "POST",
      headers: { ...authGatewayHeaders(request), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: String(email).trim().toLowerCase() }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Password reset email is temporarily unavailable." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: "Password reset email is temporarily unavailable." },
      { status: 503 },
    );
  }
}
