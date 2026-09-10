import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaqContent } from "@/components/site/MarketingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getLearningFaqs } from "@/lib/learning-guide";
import { StructuredData } from "@/components/seo/StructuredData";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "中文培训常见问题 | SureMandarin" : "Chinese Course FAQ | SureMandarin",
    description: lang === "zh" ? "零基础如何学中文？一对一与在线课程怎么选？了解 SureMandarin 课程费用咨询、跨时区上课、IB 辅导、游学与预约安排。" : "New to Mandarin? Compare private and online lessons, learn about time zones, course costs, IB Chinese tutoring, travel programmes and booking with SureMandarin.",
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
  const faqItems = getLearningFaqs(lang);
  const pageUrl = absoluteUrl(`/${lang}/faq`);
  return (
    <SiteShell locale={lang}>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "@id": `${pageUrl}#faq`,
            url: pageUrl,
            name: lang === "zh" ? "SureMandarin 中文课程常见问题" : "SureMandarin Chinese course FAQ",
            inLanguage: lang === "zh" ? "zh-Hans" : "en",
            mainEntity: faqItems.map(({ id, question, answer }) => ({
              "@type": "Question",
              "@id": `${pageUrl}#${id}`,
              name: question,
              acceptedAnswer: { "@type": "Answer", text: answer },
            })),
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "常见问题" : "FAQ", path: `/${lang}/faq` },
          ]),
        ]}
      />
      <FaqContent locale={lang} />
    </SiteShell>
  );
}
