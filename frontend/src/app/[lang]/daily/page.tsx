import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DailyChallengeApp } from "@/components/daily/DailyChallengeApp";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SiteStructuredData } from "@/components/seo/StructuredData";
import { getPublishedDailyChallengeDays } from "@/lib/daily-server";
import { isLocale } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { pageMetadata } from "@/lib/seo";
import { getGlobalData } from "@/lib/strapi";

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "zh" }];
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pageMetadata({
    locale: lang,
    title: lang === "zh" ? "SureMandarin Daily｜7 天中文口语挑战" : "SureMandarin Daily | 7-Day Chinese Speaking Challenge",
    description: lang === "zh" ? "每天 5 分钟练习真实中文表达，完成 7 天挑战并获得免费学习方案。" : "Practise real Mandarin for five minutes a day, complete the 7-day challenge, and unlock a free learning plan.",
    path: "/daily",
    image: "/daily/coffee-cup.png",
  });
}

export default async function DailyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [global, user, days] = await Promise.all([getGlobalData(lang), getCurrentUser(), getPublishedDailyChallengeDays(lang)]);
  return (
    <>
      <SiteStructuredData locale={lang} global={global} />
      <Header settings={global} locale={lang} />
      <DailyChallengeApp locale={lang} days={days} isLoggedIn={Boolean(user)} />
      <Footer settings={global} locale={lang} />
    </>
  );
}
