import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "注册 | SureMandarin" : "Create a SureMandarin Account",
    description: lang === "zh" ? "注册 SureMandarin 账户，开始中文水平测试并获得个性化学习建议。" : "Create a SureMandarin account to start your Chinese level test and personalized learning journey.",
    path: "/register",
    noIndex: true,
  }) : {};
}
export default async function Page({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <AuthForm mode="register" locale={lang} />;
}
