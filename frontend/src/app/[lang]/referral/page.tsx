import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReferralPlan } from "@/components/site/ReferralPlan";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "zh" ? "推荐计划 | SureMandarin" : "Referral Plan | SureMandarin",
    description:
      lang === "zh"
        ? "邀请朋友一起学习中文，双方都能获得 SureMandarin 学习礼遇。"
        : "Invite a friend to learn Chinese and unlock learning benefits for both of you.",
  };
}

export default async function ReferralPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <ReferralPlan locale={lang} />
    </SiteShell>
  );
}
