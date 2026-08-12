import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqContent, getFaqItems } from "@/components/site/MarketingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "中文培训常见问题 | SureMandarin" : "Chinese Course FAQ | SureMandarin",
    description: lang === "zh" ? "了解 SureMandarin 中文课程选择、适合人群、时间安排、会员和学习支持。" : "Find answers about SureMandarin Chinese courses, levels, scheduling, membership, and learning support.",
    path: "/faq",
  }) : {};
}
export default async function FaqPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const faqItems = getFaqItems(lang);
  return (
    <SiteShell locale={lang}>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqItems.map(([question, answer]) => ({
              "@type": "Question",
              name: question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: "FAQ", path: `/${lang}/faq` },
          ]),
        ]}
      />
      <FaqContent locale={lang} />
    </SiteShell>
  );
}
