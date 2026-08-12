import { NextResponse } from "next/server";
import { getAuthToken, STRAPI_URL } from "@/lib/auth";

export async function GET() {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ ok: true, persisted: false, progress: null });

  try {
    const response = await fetch(`${STRAPI_URL}/api/daily-progresses/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return NextResponse.json({ ok: true, persisted: false, progress: null });
    const payload = await response.json();
    return NextResponse.json({ ok: true, persisted: true, progress: payload?.data ?? null });
  } catch {
    return NextResponse.json({ ok: true, persisted: false, progress: null });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const day = Number(body.day);
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    return NextResponse.json({ ok: false, error: "Invalid challenge day" }, { status: 400 });
  }

  const token = await getAuthToken();
  if (!token) return NextResponse.json({ ok: true, persisted: false });

  try {
    const response = await fetch(`${STRAPI_URL}/api/daily-progresses`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          day,
          completedAt: body.completedAt || new Date().toISOString(),
          streak: Number(body.streak) || 1,
          source: "daily-challenge",
          platform: body.platform || "web",
        },
      }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json({
      ok: true,
      persisted: response.ok,
      progress: payload?.data ?? null,
      reward: payload?.data?.reward ?? null,
    });
  } catch {
    return NextResponse.json({ ok: true, persisted: false });
  }
}
