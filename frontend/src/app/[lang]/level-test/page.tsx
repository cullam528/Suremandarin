import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LevelTest } from "@/components/site/LevelTest";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMetadata({
    locale: lang,
    path: "/level-test",
    title: lang === "zh" ? "免费中文水平测试｜了解你的学习起点 | SureMandarin" : "Free Chinese Level Test | SureMandarin",
    description:
      lang === "zh"
        ? "通过中文发音、词汇和理解选择题了解当前学习起点，获取个性化课程建议。本测试不替代正式 HSK 成绩。"
        : "Try practical Mandarin pronunciation, vocabulary and comprehension questions. Get a starting point for your lessons; this is not an official HSK score.",
  });
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
