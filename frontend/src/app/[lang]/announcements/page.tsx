import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingPage } from "@/components/site/MarketingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "中文学习新闻与公告 | SureMandarin" : "Chinese Learning News & Announcements | SureMandarin",
    description: lang === "zh" ? "查看 SureMandarin 中文课程、学习活动、教育行业和社区的最新动态。" : "Follow SureMandarin course updates, Chinese learning events, education news, and community stories.",
    path: "/announcements",
  }) : {};
}
export default async function AnnouncementsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <MarketingPage kind="announcements" locale={lang} />
    </SiteShell>
  );
}
