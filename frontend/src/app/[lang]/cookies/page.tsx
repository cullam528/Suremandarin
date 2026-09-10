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
        path: "/cookies",
        description: lang === "zh" ? "了解 SureMandarin 如何使用 Cookie 和浏览器存储维护登录、安全与语言偏好，以及如何管理相关设置。" : "Understand how SureMandarin uses cookies and browser storage for sign-in, security and language preferences and how to manage them.",
        title:
          lang === "zh"
            ? "Cookie 政策 | SureMandarin"
            : "Cookie Policy | SureMandarin",
      })
    : {};
}
export default async function CookiesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <LegalPage kind="cookies" locale={lang} />
    </SiteShell>
  );
}
