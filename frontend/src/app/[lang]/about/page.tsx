import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketingPage } from "@/components/site/MarketingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "关于 SureMandarin | 专业中文培训机构" : "About SureMandarin | Chinese Language School",
    description: lang === "zh" ? "了解 SureMandarin 的中文培训理念、教师团队和面向全球学习者的课程服务。" : "Discover SureMandarin's teaching approach, experienced teachers, and practical Chinese courses for learners worldwide.",
    path: "/about",
  }) : {};
}
export default async function AboutPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <StructuredData data={[
        { "@context": "https://schema.org", "@type": "AboutPage", "@id": `${absoluteUrl(`/${lang}/about`)}#page`, url: absoluteUrl(`/${lang}/about`), name: lang === "zh" ? "关于 SureMandarin" : "About SureMandarin", inLanguage: lang === "zh" ? "zh-CN" : "en", mainEntity: { "@id": absoluteUrl("/#organization") }, isPartOf: { "@id": absoluteUrl("/#website") }, about: { "@type": "Person", name: "Jessica", jobTitle: "Founder", image: absoluteUrl("/course-detail/images/leader-Jessica.webp"), worksFor: { "@id": absoluteUrl("/#organization") } } },
        breadcrumbStructuredData([{ name: lang === "zh" ? "首页" : "Home", path: `/${lang}` }, { name: lang === "zh" ? "关于我们" : "About us", path: `/${lang}/about` }]),
      ]} />
      <MarketingPage kind="about" locale={lang} />
    </SiteShell>
  );
}
