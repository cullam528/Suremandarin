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
    title: lang === "zh" ? "中文教师团队 | SureMandarin" : "Chinese Teachers | SureMandarin",
    description: lang === "zh" ? "了解 SureMandarin 中文教师团队，获得专业、耐心且贴近真实交流的中文学习指导。" : "Meet SureMandarin Chinese teachers who make every lesson practical, clear, patient, and connected to real communication.",
    path: "/teachers",
  }) : {};
}
export default async function TeachersPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <MarketingPage kind="teachers" locale={lang} />
    </SiteShell>
  );
}
