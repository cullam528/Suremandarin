"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Check,
  Clock3,
  Mail,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { HeroSlideData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

export function HeroSection({
  slides,
  locale = "en",
}: {
  slides: HeroSlideData[];
  locale?: Locale;
}) {
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(
      () => setActive((value) => (value + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const params = new URLSearchParams({
      name,
      email,
      leadSource: "homepage-hero",
      campaign: "homepage-hero",
    });
    router.push(`/${locale}/courses/online-course?${params.toString()}`);
  };
  const slide = slides[active];
  return (
    <section id="home" className="sm-home-hero soft-gradient overflow-hidden">
      <div className="sm-home-hero-grid page-shell grid min-h-[650px] items-stretch lg:grid-cols-[.94fr_1.06fr]">
        <div className="sm-home-hero-content relative z-10 py-16 lg:py-24">
          <p className="brand-gradient mb-5 inline-flex rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white">
            {slide.eyebrow}
          </p>
          <h1 className="max-w-3xl whitespace-pre-line text-[clamp(2.7rem,5vw,4.5rem)] font-extrabold leading-[1.08] tracking-[-.055em] text-brand-navy">
            {slide.title}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
            {slide.description}
          </p>
          <form
            id="signup"
            onSubmit={submit}
            className="mt-8 grid max-w-2xl gap-2 rounded-2xl border border-brand-line bg-white p-2 shadow-xl shadow-blue-900/10 sm:grid-cols-[1fr_1.2fr_auto]"
          >
            <label className="flex items-center gap-2 px-3">
              <UserRound size={17} className="text-slate-400" />
              <span className="sr-only">Name</span>
              <input
                required
                name="name"
                placeholder={locale === "zh" ? "你的姓名" : "Your Name"}
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-2 border-brand-line px-3 sm:border-l">
              <Mail size={17} className="text-slate-400" />
              <span className="sr-only">Email</span>
              <input
                required
                type="email"
                name="email"
                placeholder={locale === "zh" ? "电子邮箱" : "Email Address"}
                className="w-full bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <button disabled={submitting} className="brand-gradient rounded-xl px-6 py-3 text-sm font-bold text-white disabled:opacity-60">
              {submitting ? (locale === "zh" ? "提交中…" : "Sending…") : locale === "zh" ? "获取我的免费学习计划" : "Get My Free Learning Plan"}{" "}
              <ArrowRight className="ml-1 inline" size={16} />
            </button>
          </form>
          <Link
            href={`/${locale}/level-test`}
            className="group mt-4 flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl border border-brand-blue/40 brand-gradient p-3.5 text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-900/20 sm:w-fit sm:min-w-[340px]"
          >
            <span className="flex min-w-0 items-center gap-3 text-left">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/30">
                <Sparkles size={20} />
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-sm font-extrabold text-white">
                  {locale === "zh" ? "免费中文水平测试" : "Free Level Test"}
                </strong>
                <span className="mt-0.5 block text-xs font-medium text-white/80">
                  {locale === "zh" ? "5分钟了解你的中文水平" : "Know your level in 5 minutes"}
                </span>
              </span>
            </span>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand-blue transition-transform group-hover:translate-x-0.5">
              <ArrowRight size={17} />
            </span>
          </Link>
          <div className="mt-3 flex max-w-2xl flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/90 px-3.5 py-2 text-xs font-bold text-brand-navy shadow-sm shadow-blue-900/5">
              <BadgeCheck size={15} className="text-brand-green" />
              <span>{locale === "zh" ? "免费咨询" : "Free consultation"}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/90 px-3.5 py-2 text-xs font-bold text-brand-navy shadow-sm shadow-blue-900/5">
              <Check size={15} className="text-brand-blue" />
              <span>{locale === "zh" ? "无需付款" : "No payment required"}</span>
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-white/90 px-3.5 py-2 text-xs font-bold text-brand-navy shadow-sm shadow-blue-900/5">
              <Clock3 size={15} className="text-brand-blue" />
              <span>{locale === "zh" ? "24小时内回复" : "Reply within 24H"}</span>
            </span>
          </div>
          <ul className="mt-6 grid max-w-2xl gap-4 text-xs sm:grid-cols-3">
            {[
              {
                icon: Award,
                title: locale === "zh" ? "专业教师" : "Expert Teachers",
                text:
                  locale === "zh"
                    ? "专业认证，经验丰富"
                    : "Professional & certified",
              },
              {
                icon: Check,
                title: locale === "zh" ? "个性化学习" : "Personalized Learning",
                text:
                  locale === "zh"
                    ? "适合不同目标和水平"
                    : "For every goal and level",
              },
              {
                icon: UsersRound,
                title: locale === "zh" ? "全球学习社区" : "Global Community",
                text:
                  locale === "zh"
                    ? "学习、连接、成长"
                    : "Learn. Connect. Grow.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-brand-blue text-white">
                  <Icon size={17} />
                </span>
                <span>
                  <strong className="block text-brand-navy">{title}</strong>
                  <span className="text-[10px] text-slate-500">{text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-3">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setActive(index)}
                aria-label={`Show slide ${index + 1}`}
                className={`size-2.5 rounded-full ${index === active ? "bg-brand-blue" : "bg-slate-300"}`}
              />
            ))}
          </div>
        </div>
        <div className="sm-home-hero-media relative min-h-[370px] lg:min-h-full">
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover object-right"
          />
          <div className="sm-home-hero-overlay pointer-events-none absolute inset-0 bg-gradient-to-r from-[#edf8ff] via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}
