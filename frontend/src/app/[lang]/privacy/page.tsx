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
        path: "/privacy",
        description: lang === "zh" ? "了解 SureMandarin 如何收集和使用账户、学习与咨询资料，以及你的隐私权利。" : "Learn how SureMandarin handles account, learning and consultation information and how to exercise your privacy rights.",
        title:
          lang === "zh"
            ? "隐私政策 | SureMandarin"
            : "Privacy Policy | SureMandarin",
      })
    : {};
}
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <LegalPage kind="privacy" locale={lang} />
    </SiteShell>
  );
}
