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
    title: lang === "zh" ? "手机学中文｜SureMandarin Daily 与学习动态" : "Learn Chinese on Your Phone | SureMandarin Daily",
    description: lang === "zh" ? "在手机浏览器中体验 SureMandarin Daily 中文口语挑战，关注学习分享。iOS、Android App 和小程序上线后将提供访问入口。" : "Start the SureMandarin Daily speaking challenge in your mobile browser and follow learning updates. Native apps and the mini program are coming later.",
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
