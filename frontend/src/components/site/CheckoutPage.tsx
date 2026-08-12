import Link from "next/link";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function CheckoutPage({
  locale,
  plan,
}: {
  locale: Locale;
  plan: string;
}) {
  const zh = locale === "zh";
  const name = plan.toLowerCase() === "svip" ? "SVIP" : "VIP";
  return (
    <section className="soft-gradient py-16 sm:py-24">
      <div className="page-shell grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
        <div className="rounded-3xl bg-white p-7 shadow-xl sm:p-10">
          <p className="section-kicker">
            {zh ? "安全结算" : "Secure checkout"}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-brand-navy sm:text-4xl">
            {zh ? `开通 ${name} 会员` : `Activate your ${name} membership`}
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-500">
            {zh
              ? "确认方案后，我们会跳转到 PayPal 完成付款。"
              : "Review your plan, then continue to PayPal to complete payment."}
          </p>
          <form className="mt-8 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-brand-navy">
              {zh ? "账户邮箱" : "Account email"}
              <input
                type="email"
                required
                placeholder={zh ? "请输入注册邮箱" : "Your account email"}
                className="course-input"
              />
            </label>
            <label className="flex gap-3 text-sm text-slate-600">
              <input required type="checkbox" className="mt-1" />
              {zh
                ? "我同意使用条款和隐私政策。"
                : "I agree to the Terms of Use and Privacy Policy."}
            </label>
            <Link
              href={`/${locale}/payment/success`}
              className="brand-gradient mt-3 inline-flex items-center justify-center gap-2 rounded-xl py-3.5 font-extrabold text-white"
            >
              <LockKeyhole size={17} />
              {zh ? "继续使用 PayPal 付款" : "Continue with PayPal"}
            </Link>
          </form>
        </div>
        <aside className="rounded-3xl bg-brand-navy p-8 text-white shadow-xl">
          <p className="text-sm font-extrabold uppercase tracking-widest text-brand-cyan">
            {name} membership
          </p>
          <h2 className="mt-5 text-3xl font-extrabold">{name}</h2>
          <div className="mt-8 grid gap-4 text-sm text-blue-100">
            <p className="flex gap-3">
              <CheckCircle2 className="text-brand-green" />
              {zh ? "会员专属内容" : "Member-only content"}
            </p>
            <p className="flex gap-3">
              <CheckCircle2 className="text-brand-green" />
              {zh ? "优先课程咨询" : "Priority course consultation"}
            </p>
            <p className="flex gap-3">
              <ShieldCheck className="text-brand-cyan" />
              {zh
                ? "由 PayPal 安全处理付款"
                : "Payments securely handled by PayPal"}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
