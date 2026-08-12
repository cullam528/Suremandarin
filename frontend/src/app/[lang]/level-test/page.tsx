import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LevelTest } from "@/components/site/LevelTest";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "zh" ? "中文水平测试 | SureMandarin" : "Chinese Level Test | SureMandarin",
    description:
      lang === "zh"
        ? "用三分钟了解你的中文水平，并获取个性化课程建议。"
        : "Find your Chinese level in three minutes and receive a personalised course direction.",
  };
}

export default async function LevelTestPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang as Locale}>
      <LevelTest locale={lang as Locale} />
    </SiteShell>
  );
}
