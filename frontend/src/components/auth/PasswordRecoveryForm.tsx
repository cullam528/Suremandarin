"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { PuzzleCaptcha, type CaptchaProof } from "./PuzzleCaptcha";

export function PasswordRecoveryForm({
  mode,
  locale = "en",
  resetCode = "",
}: {
  mode: "forgot" | "reset";
  locale?: Locale;
  resetCode?: string;
}) {
  const zh = locale === "zh";
  const forgot = mode === "forgot";
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [captchaProof, setCaptchaProof] = useState<CaptchaProof | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = new FormData(event.currentTarget);
    const payload = forgot
      ? {
          email: data.get("email"),
          captcha: { ...captchaProof, trap: data.get("company") },
        }
      : {
          code: resetCode,
          password: data.get("password"),
          passwordConfirmation: data.get("passwordConfirmation"),
        };
    const response = await fetch(`/api/auth/${forgot ? "forgot-password" : "reset-password"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? (zh ? "请稍后重试。" : "Please try again."));
      if (forgot) {
        setCaptchaProof(null);
        setCaptchaVersion((value) => value + 1);
      }
      return;
    }
    setSuccess(true);
    if (!forgot) {
      window.setTimeout(() => {
        router.push(`/${locale}/account/profile`);
        router.refresh();
      }, 900);
    }
  }

  return (
    <main className="soft-gradient min-h-screen px-4 py-12">
      <section className="mx-auto max-w-xl rounded-[2rem] bg-white p-7 shadow-2xl sm:p-12">
        <Link href={`/${locale}`} className="flex justify-center" aria-label="SureMandarin home">
          <Image src="/images/suremandarin-logo.webp?v=20260811" alt="SureMandarin logo" width={264} height={56} className="h-auto w-[min(264px,100%)] object-contain" priority />
        </Link>
        <p className="section-kicker mt-10">{zh ? "账户安全" : "Account security"}</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">
          {forgot ? (zh ? "找回账户密码" : "Reset your password") : (zh ? "设置新密码" : "Choose a new password")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {forgot
            ? (zh ? "输入注册邮箱，我们会发送安全的密码重置链接。" : "Enter your account email and we will send a secure reset link.")
            : (zh ? "新密码至少需要8个字符。完成后将自动登录。" : "Use at least 8 characters. You will be signed in after the reset.")}
        </p>

        {success ? (
          <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
            <p className="flex items-center gap-2 font-extrabold"><CheckCircle2 size={20} />{forgot ? (zh ? "重置邮件已发送" : "Reset email sent") : (zh ? "密码修改成功" : "Password updated")}</p>
            <p className="mt-2 text-sm leading-6">{forgot ? (zh ? "如果该邮箱已注册，请检查收件箱和垃圾邮件文件夹。" : "If the address is registered, check its inbox and spam folder.") : (zh ? "正在进入你的账户……" : "Opening your account…")}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 grid gap-4">
            {forgot ? (
              <>
                <label className="auth-field"><Mail /><input required name="email" type="email" autoComplete="email" placeholder={zh ? "注册邮箱" : "Account email"} /></label>
                <input name="company" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="pointer-events-none absolute h-px w-px opacity-0" />
                <PuzzleCaptcha key={`forgot-${captchaVersion}`} locale={locale} onChange={setCaptchaProof} />
              </>
            ) : (
              <>
                <PasswordField name="password" label={zh ? "新密码" : "New password"} show={show} onToggle={() => setShow(!show)} />
                <label className="auth-field"><LockKeyhole /><input required name="passwordConfirmation" type={show ? "text" : "password"} minLength={8} autoComplete="new-password" placeholder={zh ? "再次输入新密码" : "Confirm new password"} /></label>
              </>
            )}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600">{error}</p>}
            <button disabled={loading || (forgot && !captchaProof)} className="brand-gradient mt-2 rounded-xl py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60">
              {loading ? (zh ? "请稍候…" : "Please wait...") : forgot ? (zh ? "发送重置链接" : "Send reset link") : (zh ? "保存新密码" : "Save new password")}
            </button>
          </form>
        )}
        <p className="mt-8 text-center text-sm text-slate-600">
          <Link href={`/${locale}/login`} className="font-extrabold text-brand-blue">{zh ? "返回登录" : "Back to sign in"}</Link>
        </p>
      </section>
    </main>
  );
}

function PasswordField({ name, label, show, onToggle }: { name: string; label: string; show: boolean; onToggle: () => void }) {
  return (
    <label className="auth-field">
      <LockKeyhole />
      <input required name={name} type={show ? "text" : "password"} minLength={8} autoComplete="new-password" placeholder={label} />
      <button type="button" onClick={onToggle} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff /> : <Eye />}</button>
    </label>
  );
}
