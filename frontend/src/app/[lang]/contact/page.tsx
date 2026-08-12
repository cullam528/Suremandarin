import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShowcase } from "@/components/site/AppShowcase";
import { CourseConsultation } from "@/components/site/CourseConsultation";
import { MarketingPage } from "@/components/site/MarketingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { getHomepageData } from "@/lib/strapi";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "咨询中文课程 | SureMandarin" : "Talk to a Chinese Learning Advisor | SureMandarin",
    description: lang === "zh" ? "告诉我们你的中文水平、学习目标和时间安排，获取免费的个性化中文学习建议。" : "Share your Chinese level, goals, and schedule to receive a free, personalized Chinese learning recommendation.",
    path: "/contact",
  }) : {};
}
export default async function ContactPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const data = await getHomepageData(lang);
  return (
    <SiteShell locale={lang}>
      <MarketingPage kind="contact" locale={lang} />
      <div className="page-shell pb-16 sm:pb-24">
        <CourseConsultation
          courses={data.courses}
          locale={lang}
          sourcePage={`/${lang}/contact`}
          campaign="contact-consultation"
          leadSource="contact-page"
        />
      </div>
      <AppShowcase locale={lang} settings={data.global} />
    </SiteShell>
  );
}
