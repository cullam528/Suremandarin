import { NextResponse } from "next/server";

const STRAPI_URL =
  process.env.STRAPI_URL ??
  process.env.NEXT_PUBLIC_STRAPI_URL ??
  "https://api.suremandarin.com";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (
      !body.name ||
      !body.email ||
      !body.courseSlug ||
      body.privacyConsent !== true
    )
      return NextResponse.json(
        { error: "Please complete the required fields." },
        { status: 400 },
      );
    const assessment = body.testScore !== undefined
      ? {
          testScore: Number(body.testScore),
          testTotal: Number(body.testTotal ?? 12),
          testLevel: String(body.testLevel ?? body.currentLevel ?? "not-sure"),
          testBreakdown: body.testBreakdown ?? {},
          testAnswers: Array.isArray(body.testAnswers) ? body.testAnswers : [],
        }
      : {};
    const response = await fetch(`${STRAPI_URL}/api/inquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        data: {
          name: String(body.name).trim(),
          email: String(body.email).trim(),
          courseSlug: String(body.courseSlug),
          currentLevel: body.currentLevel || "not-sure",
          learningGoal: String(body.learningGoal ?? ""),
          preferredTime: String(body.preferredTime ?? ""),
          preferredDate: String(body.preferredDate ?? ""),
          weeklyStudyTime: String(body.weeklyStudyTime ?? ""),
          whatsapp: String(body.whatsapp ?? ""),
          wechat: String(body.wechat ?? ""),
          targetCourse: String(body.targetCourse ?? ""),
          sourcePage: String(body.sourcePage ?? ""),
          campaign: String(body.campaign ?? ""),
          leadSource: String(body.leadSource ?? "website"),
          referralCode: String(body.referralCode ?? ""),
          timezone: String(body.timezone ?? ""),
          platform: "web",
          status: "new",
          privacyConsent: true,
          ...assessment,
        },
      }),
      cache: "no-store",
    });
    if (!response.ok)
      return NextResponse.json(
        { error: "We could not save your request. Please try again." },
        { status: 502 },
      );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
