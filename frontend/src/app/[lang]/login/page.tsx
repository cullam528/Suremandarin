import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "登录 | SureMandarin" : "Sign In | SureMandarin",
    description: lang === "zh" ? "登录 SureMandarin 中文学习账户。" : "Sign in to your SureMandarin Chinese learning account.",
    path: "/login",
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
  return <AuthForm mode="login" locale={lang} />;
}
