import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n";

const plans = [
  {
    code: "registered",
    en: "Registered",
    zh: "注册用户",
    price: "Free",
    zhPrice: "免费",
    copy: [
      "Access public learning articles",
      "Save your learning preferences",
      "Receive course recommendations",
    ],
  },
  {
    code: "vip",
    en: "VIP",
    zh: "VIP",
    price: "Contact us for pricing",
    zhPrice: "具体请联系客服",
    copy: [
      "Member-only learning content",
      "Priority course consultation",
      "Monthly learning resources",
    ],
  },
  {
    code: "svip",
    en: "SVIP",
    zh: "SVIP",
    price: "Contact us for pricing",
    zhPrice: "具体请联系客服",
    copy: [
      "All VIP benefits",
      "Premium learning plans",
      "Priority teacher support",
    ],
  },
];
export function PricingPage({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  return (
    <section className="soft-gradient py-16 sm:py-24">
      <div className="page-shell text-center">
        <p className="section-kicker">{zh ? "会员方案" : "Membership plans"}</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
          {zh ? "选择你的学习节奏" : "Choose your learning rhythm"}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
          {zh
            ? "先从免费注册开始，随着学习目标升级 VIP 或 SVIP。"
            : "Start free and upgrade to VIP or SVIP as your learning goals grow."}
        </p>
        <div className="mx-auto mt-12 grid max-w-6xl gap-6 text-left lg:grid-cols-3">
          {plans.map((plan, index) => (
            <article
              key={plan.code}
              className={`relative rounded-3xl border bg-white p-8 shadow-sm ${index === 2 ? "border-brand-blue shadow-xl" : "border-brand-line"}`}
            >
              {index === 2 && (
                <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-brand-blue">
                  <Sparkles size={13} />
                  {zh ? "推荐" : "Recommended"}
                </span>
              )}
              <p className="text-sm font-extrabold uppercase tracking-widest text-brand-blue">
                {zh ? plan.zh : plan.en}
              </p>
              <h2 className="mt-5 text-4xl font-extrabold text-brand-navy">
                {zh ? plan.zhPrice : plan.price}
              </h2>
              <ul className="mt-8 grid gap-4">
                {plan.copy.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-slate-600">
                    <Check size={18} className="shrink-0 text-brand-green" />
                    {zh
                      ? [
                          "访问公开学习文章",
                          "保存学习偏好",
                          "获取课程推荐",
                          "会员专属学习内容",
                          "优先课程咨询",
                          "每月学习资料",
                          "包含 VIP 全部权益",
                          "高阶学习方案",
                          "优先教师支持",
                        ][plans.flatMap((p) => p.copy).indexOf(item)]
                      : item}
                  </li>
                ))}
              </ul>
              {plan.code === "registered" ? (
                <Link
                  href={`/${locale}/register`}
                  className="mt-9 block rounded-xl border border-brand-blue py-3 text-center font-extrabold text-brand-blue"
                >
                  {zh ? "免费注册" : "Create free account"}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="mt-9 block w-full cursor-not-allowed rounded-xl bg-slate-200 py-3 text-center font-extrabold text-slate-400"
                  title={zh ? "具体请联系客服" : "Please contact us for pricing"}
                >
                  {zh ? "选择此方案" : "Choose this plan"}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
