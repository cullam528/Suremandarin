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
    title: lang === "zh" ? "中文学习资料 | SureMandarin" : "Chinese Learning Resources | SureMandarin",
    description: lang === "zh" ? "获取中文学习指南、词汇练习、文化笔记和帮助你持续进步的学习资料。" : "Explore Chinese study guides, vocabulary practice, culture notes, and resources for consistent progress.",
    path: "/resources",
  }) : {};
}
export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <MarketingPage kind="resources" locale={lang} />
    </SiteShell>
  );
}
