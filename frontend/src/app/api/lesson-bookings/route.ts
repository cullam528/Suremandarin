import { NextResponse } from "next/server";
import { getAuthToken, STRAPI_URL } from "@/lib/auth";

export async function POST(request: Request) {
  const token = await getAuthToken();
  if (!token) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const response = await fetch(`${STRAPI_URL}/api/lesson-bookings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ data: body }),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Unable to create the booking." }, { status: 502 });
  }
}
