import { NextResponse } from "next/server";
import { getAuthToken, getCurrentUser, STRAPI_URL } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);
    if (!user || !token) {
      return NextResponse.json(
        { error: "Please sign in before sharing your experience." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const quote = String(body.quote ?? "").trim();
    const country = String(body.country ?? "").trim();
    const rating = Number(body.rating ?? 5);

    if (quote.length < 10 || quote.length > 1000) {
      return NextResponse.json(
        { error: "Please write between 10 and 1000 characters." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Please choose a rating from 1 to 5." },
        { status: 400 },
      );
    }

    const response = await fetch(`${STRAPI_URL}/api/testimonials/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ quote, country, rating }),
      cache: "no-store",
    });

    if (!response.ok) {
      const status =
        response.status === 401 || response.status === 403
          ? response.status
          : 502;
      return NextResponse.json(
        {
          error:
            response.status === 403
              ? "VIP or SVIP membership is required to submit a testimonial."
              : "We could not submit your experience. Please try again.",
        },
        { status },
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
