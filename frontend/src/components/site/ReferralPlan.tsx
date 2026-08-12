import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Gift,
  Link2,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function ReferralPlan({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const steps = zh
    ? [
        {
          icon: Link2,
          title: "分享你的专属链接",
          text: "把 SureMandarin 推荐链接发送给想学中文的朋友。",
        },
        {
          icon: UserPlus,
          title: "好友注册并报名",
          text: "好友通过链接注册，完成课程付款并度过退款期。",
        },
        {
          icon: Gift,
          title: "奖励自动进入审核",
          text: "每成功邀请 3 名付费学员，系统生成 2 课时待审核奖励，由 Super Admin 或 Editor 审核后发放。",
        },
      ]
    : [
        {
          icon: Link2,
          title: "Share your personal link",
          text: "Send your SureMandarin referral link to a friend who wants to learn Chinese.",
        },
        {
          icon: UserPlus,
          title: "Your friend registers and enrolls",
          text: "They register through your link, complete payment, and pass the refund window.",
        },
        {
          icon: Gift,
          title: "Your reward is reviewed",
          text: "When 3 friends complete paid enrollment and the refund window, the system creates a 2-hour reward for Super Admin or Editor review.",
        },
      ];

  return (
    <section className="sm-referral-page soft-gradient min-h-[calc(100vh-5rem)] py-10 sm:py-16">
      <div className="page-shell">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <p className="section-kicker">
              {zh ? "SureMandarin 推荐计划" : "SureMandarin referral plan"}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-.05em] text-brand-navy sm:text-6xl">
              {zh ? "一起学中文，双方都有礼遇。" : "Share Chinese learning. Both sides benefit."}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              {zh
                ? "邀请朋友加入 SureMandarin。新学员注册后自动获得 1 节试听课，推荐人也能获得可使用的课程课时。"
                : "Invite a friend to SureMandarin. New learners get a free first step, while referrers earn lesson hours they can use."}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/${locale}/account/referrals`}
                className="brand-gradient inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5"
              >
                {zh ? "进入我的推荐中心" : "Open my referral center"}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/${locale}/register`}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-blue bg-white px-5 py-3 text-sm font-extrabold text-brand-blue transition hover:bg-blue-50"
              >
                {zh ? "立即注册" : "Create an account"}
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={15} className="text-brand-green" />
                {zh ? "规则清晰，奖励可追踪" : "Clear rules and trackable rewards"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={15} className="text-brand-blue" />
                {zh ? "通过退款期后发放" : "Released after the refund window"}
              </span>
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-brand-blue/20 bg-white p-5 shadow-2xl shadow-blue-900/10 sm:p-7">
            <div className="absolute -right-3 -top-3 grid size-12 place-items-center rounded-2xl brand-gradient text-white shadow-lg shadow-blue-200">
              <Sparkles size={21} />
            </div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-brand-blue">
              {zh ? "双向奖励" : "Two-way rewards"}
            </p>
            <h2 className="mt-3 text-2xl font-extrabold text-brand-navy sm:text-3xl">
              {zh ? "推荐一次，朋友和你都得到实际好处" : "One invitation, two meaningful benefits"}
            </h2>
            <div className="mt-6 grid gap-4">
              <article className="rounded-2xl border border-brand-blue/20 bg-blue-50/80 p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-blue shadow-sm">
                    <UsersRound size={21} />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
                      {zh ? "新学员" : "New learner"}
                    </p>
                    <h3 className="mt-1 text-xl font-extrabold text-brand-navy">
                      {zh ? "免费中文水平测试 + 1 节试听课" : "Free level test + 1 trial lesson"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {zh
                        ? "通过邀请链接完成注册，即可领取免费水平评估、个性化学习计划和 1 节试听课。"
                        : "Register through the invitation link to receive a free level assessment, personal learning plan, and one trial lesson."}
                    </p>
                  </div>
                </div>
              </article>
              <article className="rounded-2xl border border-brand-green/30 bg-emerald-50/70 p-5">
                <div className="flex items-start gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-green shadow-sm">
                    <Gift size={21} />
                  </span>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                      {zh ? "推荐人" : "Referrer"}
                    </p>
                    <h3 className="mt-1 text-xl font-extrabold text-brand-navy">
                      {zh ? "成功邀请 3 名付费好友，获得 2 课时" : "Invite 3 paid friends, earn 2 lesson hours"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {zh
                        ? "好友完成付款并度过退款期后计入成功邀请；满 3 人时生成 2 课时待审核奖励。"
                        : "A friend counts after payment and the refund window; three qualified friends create a 2-hour reward for review."}
                    </p>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div>
            <p className="section-kicker">{zh ? "如何获得奖励" : "How it works"}</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight text-brand-navy sm:text-4xl">
              {zh ? "三步完成一次有效推荐" : "Three steps to a successful referral"}
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              {zh
                ? "推荐关系会记录在后台，课程、订单和奖励状态都能追踪。"
                : "Your referral relationship is recorded so course, order, and reward status can be tracked."}
            </p>
          </div>
          <ol className="grid gap-3">
            {steps.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="flex gap-4 rounded-2xl border border-brand-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand-blue">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="text-base font-extrabold text-brand-navy">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 rounded-3xl border border-brand-blue/20 bg-brand-navy p-6 text-white shadow-xl shadow-blue-900/10 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-brand-cyan">
                <BadgeCheck size={18} />
                <span className="text-sm font-extrabold">
                  {zh ? "从分享第一位朋友开始" : "Start with your first friend"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                {zh
                  ? "登录后进入我的推荐中心，即可复制专属链接并通过 WhatsApp、Facebook 或 Email 分享。"
                  : "Sign in to open your referral center, copy your personal link, and share it through WhatsApp, Facebook, or email."}
              </p>
            </div>
            <Link
              href={`/${locale}/account/referrals`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-brand-blue transition hover:bg-blue-50"
            >
              {zh ? "查看我的推荐" : "View my referrals"}
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-line bg-white/70 p-4 text-xs leading-6 text-slate-500">
          <CheckCircle2 size={16} className="mt-1 shrink-0 text-brand-green" />
          <p>
            {zh
              ? "奖励以 SureMandarin 后台记录为准。新学员优惠每人限用一次，推荐奖励在付款成功并通过退款期后生成，由 Super Admin 或 Editor 审核。"
              : "Rewards are based on SureMandarin records. Each new learner may use one referral benefit. Referrer rewards are created after payment and the refund window, then reviewed by Super Admin or Editor."}
          </p>
        </div>
      </div>
    </section>
  );
}
