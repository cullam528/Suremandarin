import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShowcase } from "@/components/site/AppShowcase";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "SureMandarin App 与小程序 | 随时学习中文" : "SureMandarin App & Mini Program | Learn Chinese Anywhere",
    description: lang === "zh" ? "下载 SureMandarin 中文学习 App，查看课程、学习进度、学习资料并随时练习中文。" : "Explore the SureMandarin app and mini program for Chinese courses, progress tracking, study resources, and practice anywhere.",
    path: "/app",
  }) : {};
}
export default async function AppPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <AppShowcase locale={lang} />
    </SiteShell>
  );
}
