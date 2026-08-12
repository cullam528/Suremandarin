import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PricingPage } from "@/components/site/PricingPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "中文课程与会员方案 | SureMandarin" : "Chinese Course & Membership Plans | SureMandarin",
    description: lang === "zh" ? "了解 SureMandarin 中文课程、VIP 和 SVIP 会员权益，选择适合自己的学习支持方案。" : "Compare SureMandarin Chinese courses and VIP or SVIP membership benefits for your learning goals.",
    path: "/pricing",
  }) : {};
}
export default async function PricingRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <PricingPage locale={lang} />
    </SiteShell>
  );
}
