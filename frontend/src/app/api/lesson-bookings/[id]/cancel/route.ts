import { NextResponse } from "next/server";
import { getAuthToken, STRAPI_URL } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const { id } = await params;
  try {
    const response = await fetch(`${STRAPI_URL}/api/lesson-bookings/${encodeURIComponent(id)}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to cancel the booking." }, { status: 502 });
  }
}
