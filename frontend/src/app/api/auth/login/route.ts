import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { enforceIpLimit, enforceAccountLimit, verifyCaptcha, authGatewayHeaders, securityErrorResponse, readAuthBody, validText } from "@/lib/auth-security";

export async function POST(request: Request) {
  try {
    await enforceIpLimit(request, "login");
    const { identifier, password, captcha } = await readAuthBody(request);
    if (!validText(identifier) || !validText(password, 1024))
      return NextResponse.json(
        { error: "Please enter your email and password." },
        { status: 400 },
      );
    if (!await verifyCaptcha(captcha, "login")) return NextResponse.json(
      { error: "Please complete the security verification.", code: "CAPTCHA_INVALID" }, { status: 400 },
    );
    await enforceAccountLimit("login", identifier);
    const response = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: "POST",
      headers: { ...authGatewayHeaders(request),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ identifier, password }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok)
      return NextResponse.json(
        { error: result?.error?.message ?? "Incorrect email or password." },
        { status: response.status },
      );
    if (!result || typeof result !== "object" || Array.isArray(result)
      || typeof result.jwt !== "string" || !result.jwt || !result.user
      || typeof result.user !== "object" || Array.isArray(result.user)) {
      return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 502 });
    }
    await setAuthCookie(result.jwt);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
