import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalPage } from "@/components/legal/LegalPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang)
    ? pageMetadata({
        locale: lang,
        path: "/terms",
        description: lang === "zh" ? "阅读 SureMandarin 网站、账户与中文学习服务的使用条款，了解预约、付款和服务规则。" : "Read the terms for SureMandarin website, accounts and Chinese learning services, including bookings, payments and service rules.",
        title:
          lang === "zh"
            ? "使用条款 | SureMandarin"
            : "Terms of Use | SureMandarin",
      })
    : {};
}
export default async function TermsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <LegalPage kind="terms" locale={lang} />
    </SiteShell>
  );
}
