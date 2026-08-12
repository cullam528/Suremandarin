"use client";

import Link from "next/link";
import { CheckCircle2, MessageSquareQuote, Star } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

type SessionUser = {
  fullName?: string;
  username?: string;
  email?: string;
  membershipLevel?: string;
};

export function TestimonialSubmission({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(5);

  useEffect(() => {
    fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  // Guests should not see an evaluation box. The page still shows published stories.
  if (!user) return null;

  const membershipLevel = String(user.membershipLevel ?? "").toLowerCase();
  const canSubmit = membershipLevel === "vip" || membershipLevel === "svip";

  if (!canSubmit) {
    return (
      <div className="mt-10 flex flex-col gap-5 rounded-3xl border border-brand-line bg-brand-soft p-7 sm:flex-row sm:items-center sm:justify-between sm:p-9">
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-brand-blue shadow-sm">
            <MessageSquareQuote size={21} />
          </span>
          <div>
            <h3 className="font-extrabold text-brand-navy">
              {zh ? "VIP / SVIP 会员专属" : "Exclusive to VIP / SVIP members"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {zh
                ? "升级会员后即可分享你的学习体验。"
                : "Upgrade your membership to share your learning experience."}
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/pricing`}
          className="brand-gradient inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-200"
        >
          {zh ? "查看会员方案" : "View membership plans"}
        </Link>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/testimonials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: form.get("quote"),
          country: form.get("country"),
          rating,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(
          result.error ?? (zh ? "提交失败，请稍后重试。" : "Please try again."),
        );
        return;
      }
      setSubmitted(true);
      setRating(5);
      event.currentTarget.reset();
    } catch {
      setError(zh ? "提交失败，请稍后重试。" : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-10 rounded-3xl border border-brand-line bg-white p-7 shadow-xl shadow-blue-900/5 sm:p-9">
      {submitted ? (
        <div className="flex items-start gap-4 rounded-2xl bg-emerald-50 p-5 text-emerald-800">
          <CheckCircle2 className="mt-0.5 shrink-0" />
          <div>
            <h3 className="font-extrabold">
              {zh ? "感谢你的分享" : "Thank you for sharing"}
            </h3>
            <p className="mt-1 text-sm leading-6">
              {zh
                ? "你的评价已提交，管理员审核通过后会展示在 They Say 中。"
                : "Your review has been submitted and will appear in They Say after admin approval."}
            </p>
          </div>
        </div>
      ) : (
        <form
          onSubmit={submit}
          className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-end"
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-blue">
                <MessageSquareQuote size={21} />
              </span>
              <div>
                <h3 className="font-extrabold text-brand-navy">
                  {zh ? "发表你的学习体验" : "Share your learning experience"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {zh ? "当前账号" : "Signed in as"}:{" "}
                  {user.fullName || user.email}
                </p>
              </div>
            </div>
            <textarea
              required
              minLength={10}
              maxLength={1000}
              name="quote"
              rows={4}
              placeholder={
                zh
                  ? "课程带给你什么改变？"
                  : "What has your SureMandarin experience changed for you?"
              }
              className="course-input mt-5 resize-y"
            />
          </div>
          <div className="grid gap-3">
            <label className="text-xs font-bold text-brand-navy">
              {zh ? "所在国家 / 地区" : "Country / region"}
              <input
                name="country"
                className="course-input mt-2"
                placeholder={zh ? "例如：中国" : "For example: China"}
              />
            </label>
            <label className="text-xs font-bold text-brand-navy">
              {zh ? "评分" : "Rating"}
              <span
                className="mt-2 flex items-center gap-1 rounded-xl border border-brand-line bg-white px-3 py-2"
                role="radiogroup"
                aria-label={zh ? "选择 1 到 5 星" : "Choose 1 to 5 stars"}
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const value = index + 1;
                  const selected = value <= rating;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={rating === value}
                      aria-label={
                        zh
                          ? `${value} 星`
                          : `${value} star${value > 1 ? "s" : ""}`
                      }
                      onClick={() => setRating(value)}
                      className="rounded-md p-1 text-brand-orange transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                    >
                      <Star
                        size={21}
                        fill={selected ? "currentColor" : "none"}
                      />
                    </button>
                  );
                })}
              </span>
            </label>
            {error && (
              <p role="alert" className="text-xs font-semibold text-red-600">
                {error}
              </p>
            )}
            <button
              disabled={submitting}
              className="brand-gradient rounded-xl py-3 font-extrabold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {submitting
                ? zh
                  ? "提交中…"
                  : "Submitting..."
                : zh
                  ? "提交评价"
                  : "Submit review"}
            </button>
            <p className="text-[11px] leading-4 text-slate-400">
              {zh
                ? "评价会先进入后台审核，审核通过后公开展示。"
                : "Reviews are moderated before they are published."}
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
