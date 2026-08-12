import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TheySayContent } from "@/components/TheySayContent";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { getHomepageData } from "@/lib/strapi";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "zh" ? "学员评价 | They Say" : "They Say | SureMandarin",
    description:
      lang === "zh"
        ? "了解全球学习者在 SureMandarin 的真实学习体验。"
        : "Hear real learning stories from the SureMandarin community.",
  };
}

export default async function TheySayPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const home = await getHomepageData(lang);

  return (
    <SiteShell locale={lang}>
      <TheySayContent
        testimonials={home.testimonials}
        title={home.testimonialSectionTitle}
        locale={lang}
        showSubmission
      />
    </SiteShell>
  );
}
