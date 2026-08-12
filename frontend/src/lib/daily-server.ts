import { STRAPI_URL } from "@/lib/auth";
import { getDailyChallengeDays, type DailyChallengeDay } from "@/lib/daily";
import type { Locale } from "@/lib/i18n";

export async function getPublishedDailyChallengeDays(locale: Locale): Promise<DailyChallengeDay[]> {
  try {
    const response = await fetch(
      `${STRAPI_URL}/api/daily-challenge-days?filters[enabled][$eq]=true&sort=dayNumber:asc&pagination[pageSize]=7&populate=image`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(2500) },
    );
    if (!response.ok) return getDailyChallengeDays(locale);
    const payload = await response.json();
    const records = Array.isArray(payload?.data) ? payload.data : [];
    if (records.length < 1) return getDailyChallengeDays(locale);
    return records.map((entry: { attributes?: Record<string, unknown> } & Record<string, unknown>) => {
      const value = (entry.attributes ?? entry) as Record<string, unknown>;
      const media = value.image as { data?: { attributes?: { url?: string } } } | undefined;
      const imageUrl = media?.data?.attributes?.url;
      const fallback = getDailyChallengeDays(locale)[Number(value.dayNumber) - 1]?.image ?? "/images/hero-global-learners.webp";
      return {
        dayNumber: Number(value.dayNumber),
        slug: String(value.slug ?? `day-${value.dayNumber}`),
        title: locale === "zh" ? String(value.titleZh ?? value.titleEn) : String(value.titleEn ?? value.titleZh),
        titleZh: String(value.titleZh ?? value.titleEn),
        phraseZh: String(value.phraseZh ?? ""),
        phraseEn: String(value.phraseEn ?? ""),
        prompt: locale === "zh" ? String(value.promptZh ?? value.promptEn ?? "") : String(value.promptEn ?? value.promptZh ?? ""),
        promptZh: String(value.promptZh ?? value.promptEn ?? ""),
        category: String(value.category ?? "Daily Chinese"),
      estimatedMinutes: Number(value.estimatedMinutes ?? 5),
        audioUrl: String(value.audioUrl ?? getDailyChallengeDays(locale)[Number(value.dayNumber) - 1]?.audioUrl ?? ""),
        image: imageUrl ? (imageUrl.startsWith("http") ? imageUrl : `${STRAPI_URL}${imageUrl}`) : fallback,
      };
    }).filter((day: DailyChallengeDay) => Number.isInteger(day.dayNumber) && day.dayNumber > 0);
  } catch {
    return getDailyChallengeDays(locale);
  }
}
