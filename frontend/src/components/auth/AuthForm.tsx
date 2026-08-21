"use client";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { PuzzleCaptcha, type CaptchaProof } from "./PuzzleCaptcha";

export function AuthForm({
  mode,
  locale = "en",
}: {
  mode: "login" | "register";
  locale?: Locale;
}) {
  const register = mode === "register";
  const zh = locale === "zh";
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [inviterName, setInviterName] = useState("");
  const [sourceChannel, setSourceChannel] = useState("website");
  const [captchaProof, setCaptchaProof] = useState<CaptchaProof | null>(null);
  const [captchaVersion, setCaptchaVersion] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("oauth");
    const referralCodeFromUrl = register ? params.get("ref")?.trim() ?? "" : "";
    const inviterNameFromUrl = register ? params.get("refName")?.trim() ?? "" : "";
    const sourceChannelFromUrl = register ? params.get("source")?.trim() || "website" : "website";
    const timer = window.setTimeout(() => {
      if (register) {
        setReferralCode(referralCodeFromUrl);
        setInviterName(inviterNameFromUrl);
        setSourceChannel(sourceChannelFromUrl);
      }
      if (reason) {
        setError(
          reason === "cancelled"
            ? zh
              ? "第三方登录已取消。"
              : "Social sign-in was cancelled."
            : reason === "missing_email"
              ? zh
                ? "该平台没有提供电子邮箱，请先在平台账户中公开或验证邮箱后重试。"
                : "The provider did not share an email address. Verify or allow email access and try again."
              : reason === "account_exists"
                ? zh
                  ? "该邮箱已注册，请先用原有方式登录。为保护账户安全，暂不自动合并账号。"
                  : "This email is already registered. Please use your original sign-in method; accounts are not merged automatically for security."
                : zh
                  ? "第三方登录未能完成，请稍后重试。"
                  : "Social sign-in could not be completed. Please try again.",
        );
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [register, zh]);

  function socialHref(provider: "google" | "linkedin" | "twitter") {
    const query = new URLSearchParams({ locale, mode });
    if (register && referralCode) query.set("ref", referralCode);
    if (register && inviterName) query.set("refName", inviterName);
    if (register) query.set("source", sourceChannel);
    return `/api/auth/oauth/${provider}?${query.toString()}`;
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const referralCode = register
      ? new URLSearchParams(window.location.search).get("ref")
      : null;
    const sourceChannel = register
      ? new URLSearchParams(window.location.search).get("source") || "website"
      : null;
    const payload = register
      ? {
          fullName: fd.get("fullName"),
          email: fd.get("email"),
          password: fd.get("password"),
          privacyConsent: fd.get("privacyConsent") === "on",
          marketingConsent: fd.get("marketingConsent") === "on",
          referralCode,
          sourceChannel,
          captcha: { ...captchaProof, trap: fd.get("company") },
        }
      : {
          identifier: fd.get("email"),
          password: fd.get("password"),
          captcha: { ...captchaProof, trap: fd.get("company") },
        };
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? (zh ? "请稍后重试。" : "Please try again."));
      setCaptchaProof(null);
      setCaptchaVersion((value) => value + 1);
      return;
    }
    router.push(`/${locale}/account/profile`);
    router.refresh();
  }
  const displayInviter = inviterName || (zh ? "SureMandarin 学员" : "a SureMandarin learner");
  return (
    <main className="sm-auth-page soft-gradient min-h-[calc(100vh-5rem)] py-12">
      <div className="sm-auth-card page-shell grid overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[.9fr_1.1fr]">
        <section className="relative hidden min-h-[680px] overflow-hidden bg-brand-navy lg:block">
          <Image
            src="/images/hero-culture.webp"
            alt={
              zh
                ? "探索中文与中国文化"
                : "Discover Chinese language and culture"
            }
            fill
            priority
            className="object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/20 to-transparent" />
          <div className="absolute bottom-0 p-12 text-white">
            <p className="text-sm font-extrabold uppercase tracking-widest text-brand-cyan">
              {zh ? "开启学习之旅" : "Start your journey"}
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight">
              {zh
                ? "自信开口，在连接中学会中文。"
                : "Learn Chinese with confidence and connection."}
            </h1>
            <p className="mt-5 leading-7 text-blue-100">
              {zh
                ? "一个账户即可访问网站、移动端 App 和小程序。"
                : "One account gives you access across the website, mobile app and mini program."}
            </p>
          </div>
        </section>
        <section className="sm-auth-form-panel px-6 py-10 sm:px-12 lg:px-16 lg:py-14">
          <Link
            href={`/${locale}`}
            aria-label="SureMandarin home"
            className="flex justify-center"
          >
            <Image
            src="/images/suremandarin-logo.webp?v=20260811"
              alt="SureMandarin logo"
              width={264}
              height={56}
              className="h-auto w-[min(264px,100%)] object-contain"
            />
          </Link>
          <p className="section-kicker mt-10">
            {register
              ? zh
                ? "创建账户"
                : "Create your account"
              : zh
                ? "欢迎回来"
                : "Welcome back"}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-brand-navy">
            {register
              ? zh
                ? "开始在 SureMandarin 学习"
                : "Start learning with SureMandarin"
              : zh
                ? "登录并继续学习"
                : "Sign in to continue learning"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {register
              ? zh
                ? "新账户默认为注册用户，之后可升级为 VIP 或 SVIP。"
                : "New accounts begin at Registered level. You can upgrade to VIP or SVIP later."
              : zh
                ? "请使用账户绑定的电子邮箱和密码登录。"
              : "Use the email address and password connected to your account."}
          </p>
          {register && referralCode && (
            <div className="mt-6 rounded-2xl border border-brand-blue/20 bg-blue-50/80 p-4">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-blue shadow-sm">
                  <Gift size={19} />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-brand-navy">
                    {zh ? `你受 ${displayInviter} 邀请` : `You were invited by ${displayInviter}`}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {zh
                      ? "完成注册即可获得免费中文水平测试和个性化学习计划。"
                      : "Complete your registration to receive a free Chinese level assessment and personal learning plan."}
                  </p>
                </div>
              </div>
            </div>
          )}
          <form onSubmit={submit} className="mt-8 grid gap-4">
            {register && (
              <label className="auth-field">
                <UserRound />
                <input
                  required
                  name="fullName"
                  autoComplete="name"
                  placeholder={zh ? "姓名" : "Full name"}
                />
              </label>
            )}
            <label className="auth-field">
              <Mail />
              <input
                required
                name="email"
                type="email"
                autoComplete="email"
                placeholder={zh ? "电子邮箱" : "Email address"}
              />
            </label>
            <label className="auth-field">
              <LockKeyhole />
              <input
                required
                name="password"
                type={show ? "text" : "password"}
                minLength={8}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={zh ? "密码" : "Password"}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={
                  show
                    ? zh
                      ? "隐藏密码"
                      : "Hide password"
                    : zh
                      ? "显示密码"
                      : "Show password"
                }
              >
                {show ? <EyeOff /> : <Eye />}
              </button>
            </label>
            <input
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="pointer-events-none absolute h-px w-px opacity-0"
            />
            <PuzzleCaptcha
              key={`${mode}-${captchaVersion}`}
              locale={locale}
              onChange={setCaptchaProof}
            />
            {register && (
              <>
                <label className="flex gap-3 text-xs leading-5 text-slate-600">
                  <input
                    required
                    name="privacyConsent"
                    type="checkbox"
                    className="mt-1"
                  />
                  {zh
                    ? "我同意隐私政策和使用条款。"
                    : "I agree to the Privacy Policy and Terms of Use."}
                </label>
                <label className="flex gap-3 text-xs leading-5 text-slate-600">
                  <input
                    name="marketingConsent"
                    type="checkbox"
                    className="mt-1"
                  />
                  {zh
                    ? "向我发送实用的学习技巧和 SureMandarin 最新消息。"
                    : "Send me useful learning tips and SureMandarin updates."}
                </label>
              </>
            )}
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-600"
              >
                {error}
              </p>
            )}
            <button
              disabled={loading || !captchaProof}
              className="brand-gradient mt-2 rounded-xl py-3.5 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {loading
                ? zh
                  ? "请稍候…"
                  : "Please wait..."
                : register
                  ? zh
                    ? "创建账户"
                    : "Create my account"
                  : zh
                    ? "登录"
                    : "Sign in"}
            </button>
          </form>
          <div className="my-7 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-brand-line" />
            {zh ? "或使用以下账号继续" : "OR CONTINUE WITH"}
            <span className="h-px flex-1 bg-brand-line" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href={socialHref("google")}
              className="rounded-xl border border-brand-line px-4 py-3 text-center text-sm font-bold text-brand-navy hover:border-brand-blue"
            >
              Google
            </Link>
            <Link
              href={socialHref("linkedin")}
              className="rounded-xl border border-brand-line px-4 py-3 text-center text-sm font-bold text-brand-navy hover:border-brand-blue"
            >
              LinkedIn
            </Link>
            <Link
              href={socialHref("twitter")}
              className="rounded-xl border border-brand-line px-4 py-3 text-center text-sm font-bold text-brand-navy hover:border-brand-blue"
            >
              X
            </Link>
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-slate-500">
            {zh ? "继续即表示您同意" : "By continuing, you agree to our"}{" "}
            <Link className="font-bold text-brand-blue hover:underline" href={`/${locale}/terms`}>
              {zh ? "使用条款" : "Terms of Use"}
            </Link>{" "}
            {zh ? "和" : "and"}{" "}
            <Link className="font-bold text-brand-blue hover:underline" href={`/${locale}/privacy`}>
              {zh ? "隐私政策" : "Privacy Policy"}
            </Link>
            。
          </p>
          <div className="my-7 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-brand-line" />
            {zh ? "账户安全保障" : "SECURE ACCOUNT"}
            <span className="h-px flex-1 bg-brand-line" />
          </div>
          <p className="text-center text-sm text-slate-600">
            {!register && (
              <>
                <Link className="font-extrabold text-brand-blue" href={`/${locale}/forgot-password`}>
                  {zh ? "忘记密码？" : "Forgot password?"}
                </Link>
                <span className="mx-2 text-slate-300">·</span>
              </>
            )}
            {register
              ? zh
                ? "已经有账户？"
                : "Already have an account?"
              : zh
                ? "还没有 SureMandarin 账户？"
                : "New to SureMandarin?"}{" "}
            <Link
              className="font-extrabold text-brand-blue"
              href={register ? `/${locale}/login` : `/${locale}/register`}
            >
              {register
                ? zh
                  ? "登录"
                  : "Sign in"
                : zh
                  ? "创建账户"
                  : "Create an account"}
            </Link>
          </p>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={15} className="text-brand-green" />
            {zh
              ? "您的密码会被安全加密传输。"
              : "Your password is transmitted securely."}
          </p>
        </section>
      </div>
    </main>
  );
}
