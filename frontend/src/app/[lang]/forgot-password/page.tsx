import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({ locale: lang, title: lang === "zh" ? "找回密码 | SureMandarin" : "Forgot Password | SureMandarin", description: lang === "zh" ? "找回 SureMandarin 账户密码。" : "Reset your SureMandarin account password.", path: "/forgot-password", noIndex: true }) : {};
}

export default async function Page({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return <PasswordRecoveryForm mode="forgot" locale={lang} />;
}
