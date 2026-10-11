import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

type SupportedLocale = "en" | "zh";

export const dynamic = "force-dynamic";

function getPreferredLocale(acceptLanguage: string): SupportedLocale {
  const languages = acceptLanguage
    .split(",")
    .map((item, index) => {
      const [language = "", ...parameters] = item.trim().toLowerCase().split(";");
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().startsWith("q="),
      );
      const parsedQuality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;

      return {
        language,
        quality: Number.isFinite(parsedQuality) ? parsedQuality : 0,
        index,
      };
    })
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of languages) {
    if (language === "zh" || language.startsWith("zh-")) return "zh";
    if (language === "en" || language.startsWith("en-")) return "en";
  }

  return "en";
}

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  // These query keys were routes in the retired CMS, not homepage campaigns.
  // Do not turn missing legacy articles/directories into homepage soft 404s.
  if (Object.keys(query).some((key) => /^(?:article|industry|gbook)\//i.test(key))) {
    notFound();
  }

  const forwardedQuery = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((item) => forwardedQuery.append(key, item));
    else if (value !== undefined) forwardedQuery.append(key, value);
  }
  const queryString = forwardedQuery.toString();
  const suffix = queryString ? `?${queryString}` : "";
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("suremandarin_locale")?.value;

  if (savedLocale === "en" || savedLocale === "zh") {
    redirect(`/${savedLocale}${suffix}`);
  }

  const headerStore = await headers();
  const locale = getPreferredLocale(headerStore.get("accept-language") ?? "");

  redirect(`/${locale}${suffix}`);
}
