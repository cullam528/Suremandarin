import { NextResponse } from "next/server";
import { setAuthCookie, STRAPI_URL } from "@/lib/auth";
import { allowRequest } from "@/lib/puzzle-captcha";

export async function POST(request: Request) {
  try {
    if (!allowRequest(request, "reset-password", 8, 15 * 60_000)) {
      return NextResponse.json(
        { error: "Too many reset attempts. Please try again later." },
        { status: 429 },
      );
    }
    const { code, password, passwordConfirmation } = await request.json();
    if (!code) return NextResponse.json({ error: "The reset link is incomplete or expired." }, { status: 400 });
    if (String(password ?? "").length < 8) {
      return NextResponse.json({ error: "Password must contain at least 8 characters." }, { status: 400 });
    }
    if (password !== passwordConfirmation) {
      return NextResponse.json({ error: "The two passwords do not match." }, { status: 400 });
    }
    const response = await fetch(`${STRAPI_URL}/api/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ code, password, passwordConfirmation }),
      cache: "no-store",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error?.message ?? "The reset link is invalid or expired." },
        { status: response.status },
      );
    }
    if (result.jwt) await setAuthCookie(result.jwt);
    return NextResponse.json({ ok: true, user: result.user });
  } catch {
    return NextResponse.json({ error: "Unable to reset the password." }, { status: 500 });
  }
}
