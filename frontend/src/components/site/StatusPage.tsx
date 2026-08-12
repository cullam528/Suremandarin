import Link from "next/link";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";
export function StatusPage({
  locale,
  status,
}: {
  locale: Locale;
  status: "success" | "cancel" | "failed";
}) {
  const zh = locale === "zh";
  const success = status === "success";
  const cancel = status === "cancel";
  const Icon = success ? CheckCircle2 : cancel ? CircleAlert : XCircle;
  return (
    <section className="soft-gradient grid min-h-[calc(100vh-5rem)] place-items-center py-20">
      <div className="page-shell max-w-xl text-center">
        <Icon
          size={70}
          className={`mx-auto ${success ? "text-brand-green" : "text-brand-orange"}`}
        />
        <p className="section-kicker mt-7">
          {success
            ? zh
              ? "付款完成"
              : "Payment complete"
            : cancel
              ? zh
                ? "付款已取消"
                : "Payment cancelled"
              : zh
                ? "付款需要处理"
                : "Payment needs attention"}
        </p>
        <h1 className="mt-3 text-4xl font-extrabold text-brand-navy">
          {success
            ? zh
              ? "欢迎加入 SureMandarin"
              : "Welcome to SureMandarin"
            : cancel
              ? zh
                ? "你的订单没有扣款"
                : "Your order was not charged"
              : zh
                ? "暂时没有完成付款"
                : "Your payment was not completed"}
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          {success
            ? zh
              ? "会员权益将在账户中显示。"
              : "Your membership benefits will appear in your account."
            : zh
              ? "你可以返回会员方案页重新选择。"
              : "You can return to membership plans and try again."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href={`/${locale}/account`}
            className="brand-gradient rounded-xl px-6 py-3 font-extrabold text-white"
          >
            {zh ? "查看账户" : "View account"}
          </Link>
          <Link
            href={`/${locale}/pricing`}
            className="rounded-xl border border-brand-blue bg-white px-6 py-3 font-extrabold text-brand-blue"
          >
            {zh ? "返回会员方案" : "Back to plans"}
          </Link>
        </div>
      </div>
    </section>
  );
}
