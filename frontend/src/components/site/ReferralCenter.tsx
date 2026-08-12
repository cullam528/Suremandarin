"use client";

import {
  BadgeCheck,
  Check,
  Copy,
  FileText,
  Gift,
  Mail,
  MessageCircle,
  Share2,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { AccountOverview } from "@/lib/account-data";

const sourceLabels: Record<string, string> = {
  website: "Website",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  email: "Email",
  miniprogram: "Mini program",
  ios: "iOS",
  android: "Android",
};

const rewardLabels: Record<string, string> = {
  pending: "Pending",
  "pending-review": "Pending review",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
};

export function ReferralCenter({
  locale,
  referralCode,
  referrerName,
  overview,
}: {
  locale: Locale;
  referralCode: string;
  referrerName: string;
  overview: AccountOverview | null;
}) {
  const zh = locale === "zh";
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const canShare = typeof navigator !== "undefined" && Boolean(navigator.share);
  const referralPath = `/${locale}/register?ref=${encodeURIComponent(referralCode)}&refName=${encodeURIComponent(referrerName)}`;
  const stats = overview?.referralStats ?? {
    invitedCount: 0,
    registeredCount: 0,
    enrolledCount: 0,
    pendingRewardHours: 0,
    earnedRewardHours: 0,
  };
  const records = overview?.referrals ?? [];

  function referralUrlForSource(source: string) {
    return `${window.location.origin}${referralPath}&source=${source}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${referralPath}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: zh ? "一起学中文" : "Learn Chinese with me",
        text: zh
          ? "我在 SureMandarin 学中文，一起开始吧！"
          : "I am learning Chinese with SureMandarin. Join me!",
        url: `${window.location.origin}${referralPath}`,
      });
      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
      return;
    }
    await copyLink();
  }

  const shareText = zh
    ? "我在 SureMandarin 学中文，一起开始吧！"
    : "I am learning Chinese with SureMandarin. Join me!";
  const shareLinks = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralUrlForSource("whatsapp")}`)}`,
    },
    {
      label: "Facebook",
      icon: Share2,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrlForSource("facebook"))}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(zh ? "一起学习中文" : "Learn Chinese with me")}&body=${encodeURIComponent(`${shareText}\n\n${referralUrlForSource("email")}`)}`,
    },
  ];

  const statCards = [
    { icon: UsersRound, value: stats.invitedCount, label: zh ? "已邀请人数" : "People invited" },
    { icon: BadgeCheck, value: stats.registeredCount, label: zh ? "已注册人数" : "Registered" },
    { icon: FileText, value: stats.enrolledCount, label: zh ? "已报名人数" : "Enrolled" },
    { icon: Gift, value: `${stats.pendingRewardHours.toFixed(1)} ${zh ? "课时" : "hours"}`, label: zh ? "待发放奖励" : "Pending rewards" },
    { icon: Check, value: `${stats.earnedRewardHours.toFixed(1)} ${zh ? "课时" : "hours"}`, label: zh ? "已获得奖励" : "Rewards earned" },
  ];

  return (
    <div className="mt-10 grid gap-5">
      <div className="rounded-2xl border border-brand-line bg-brand-soft p-5">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-blue shadow-sm">
            <Gift size={21} />
          </span>
          <div>
            <h2 className="font-extrabold text-brand-navy">
              {zh ? "邀请朋友一起学中文" : "Invite a friend to learn Chinese"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {zh
                ? "朋友通过邀请链接注册后会自动获得 1 节试听课；完成付费并通过退款期后，推荐奖励进入审核流程。"
                : "A friend receives one trial lesson after registering; your reward moves to review after their paid enrollment and refund window."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-blue/20 bg-blue-50 px-4 py-3 text-xs font-bold text-brand-navy">
          <span>{zh ? "推荐规则：邀请 3 名有效付费好友，生成 2 课时待审核奖励" : "Referral rule: 3 qualified paid friends create a 2-hour reward for review"}</span>
          <a href={`/${locale}/referral`} className="inline-flex items-center gap-1 text-brand-blue hover:underline">
            {zh ? "查看完整规则" : "View full rules"}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line bg-white p-5">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {zh ? "我的推荐链接" : "My referral link"}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <code className="rounded-xl bg-brand-soft px-4 py-3 text-lg font-extrabold tracking-wider text-brand-blue">
            {referralCode}
          </code>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-brand-blue px-4 py-3 text-sm font-extrabold text-brand-blue"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? (zh ? "已复制" : "Copied") : zh ? "复制链接" : "Copy link"}
          </button>
        </div>
        <p className="mt-3 break-all text-xs leading-5 text-slate-500">{referralPath}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {shareLinks.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target={label === "Email" ? undefined : "_blank"}
              rel={label === "Email" ? undefined : "noreferrer"}
              className="inline-flex items-center gap-2 rounded-xl border border-brand-line px-3 py-2 text-xs font-extrabold text-brand-navy transition hover:border-brand-blue hover:bg-blue-50"
            >
              <Icon size={15} />
              {label}
            </a>
          ))}
          <button
            type="button"
            onClick={shareLink}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-3 py-2 text-xs font-extrabold text-white"
          >
            {shared ? <Check size={15} /> : canShare ? <Share2 size={15} /> : <Copy size={15} />}
            {shared ? (zh ? "已分享" : "Shared") : zh ? "更多分享" : "More sharing"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(({ icon: Icon, value, label }) => (
          <div key={String(label)} className="rounded-2xl border border-brand-line bg-white p-4">
            <Icon size={18} className="text-brand-blue" />
            <p className="mt-3 text-xl font-extrabold text-brand-navy">{value}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-line bg-white">
        <div className="border-b border-brand-line px-5 py-4">
          <h2 className="font-extrabold text-brand-navy">{zh ? "推荐记录" : "Referral records"}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {zh ? "来源渠道、推荐关系、课程、订单和奖励状态" : "Source, people, course, order, and reward status"}
          </p>
        </div>
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-xs">
              <thead className="bg-brand-soft text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">{zh ? "来源渠道" : "Source"}</th>
                  <th className="px-5 py-3">{zh ? "推荐人" : "Referrer"}</th>
                  <th className="px-5 py-3">{zh ? "被推荐人" : "Referred person"}</th>
                  <th className="px-5 py-3">{zh ? "课程" : "Course"}</th>
                  <th className="px-5 py-3">{zh ? "订单" : "Order"}</th>
                  <th className="px-5 py-3">{zh ? "奖励课时" : "Reward hours"}</th>
                  <th className="px-5 py-3">{zh ? "奖励状态" : "Reward"}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={`${record.referredEmail || "referral"}-${index}`} className="border-t border-brand-line">
                    <td className="px-5 py-4 font-bold text-brand-blue">{sourceLabels[record.sourceChannel] || record.sourceChannel || "Website"}</td>
                    <td className="px-5 py-4 text-slate-600">{record.referrerName || "—"}</td>
                    <td className="px-5 py-4 font-bold text-brand-navy">{record.referredName || record.referredEmail || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{record.courseName || "—"}</td>
                    <td className="px-5 py-4 text-slate-600">{record.orderNumber || "—"}</td>
                    <td className="px-5 py-4 font-bold text-brand-navy">{record.rewardHours.toFixed(1)}</td>
                    <td className="px-5 py-4 font-bold text-emerald-700">{rewardLabels[record.rewardStatus] || record.rewardStatus || "Pending"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            {zh ? "暂时还没有推荐记录，分享你的专属链接开始邀请吧。" : "No referral records yet. Share your link to invite a friend."}
          </div>
        )}
      </div>

      <p className="text-xs leading-6 text-slate-500">
        {zh
          ? "奖励将在新学员完成付款并通过退款期后生成，由 Super Admin 或 Editor 审核；每位朋友只能使用一次推荐优惠。"
          : "Rewards are created after payment and the refund window, then reviewed by Super Admin or Editor. Each friend may use one referral benefit."}
      </p>
    </div>
  );
}
