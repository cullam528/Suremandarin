import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({ locale: lang, title: lang === "zh" ? "重置密码 | SureMandarin" : "Reset Password | SureMandarin", description: lang === "zh" ? "设置 SureMandarin 账户新密码。" : "Choose a new SureMandarin account password.", path: "/reset-password", noIndex: true }) : {};
}

export default async function Page({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ code?: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { code = "" } = await searchParams;
  return <PasswordRecoveryForm mode="reset" locale={lang} resetCode={code} />;
}
