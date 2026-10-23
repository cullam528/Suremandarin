import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { enforceIpLimit, enforceAccountLimit, authGatewayHeaders, securityErrorResponse, readAuthBody, validText } from "@/lib/auth-security";

export async function POST(request: Request) {
  try {
    await enforceIpLimit(request, "reset-password");
    const { code, password, passwordConfirmation } = await readAuthBody(request);
    if (!validText(code, 512)) return NextResponse.json({ error: "The reset link is incomplete or expired." }, { status: 400 });
    if (!validText(password, 1024) || password.length < 8) {
      return NextResponse.json({ error: "Password must contain at least 8 characters." }, { status: 400 });
    }
    if (password !== passwordConfirmation) {
      return NextResponse.json({ error: "The two passwords do not match." }, { status: 400 });
    }
    await enforceAccountLimit("reset-password", code);
    const response = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { ...authGatewayHeaders(request), "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, password, passwordConfirmation }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error?.message ?? "The reset link is invalid or expired." },
        { status: response.status },
      );
    }
    if (!result || typeof result !== "object" || Array.isArray(result)
      || typeof result.jwt !== "string" || !result.jwt || !result.user
      || typeof result.user !== "object" || Array.isArray(result.user)) {
      return NextResponse.json({ error: "Unable to reset the password." }, { status: 502 });
    }
    await setAuthCookie(result.jwt);
    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    const securityResponse = securityErrorResponse(error);
    if (securityResponse) return securityResponse;
    return NextResponse.json({ error: "Unable to reset the password." }, { status: 500 });
  }
}
