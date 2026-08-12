"use client";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Send,
} from "lucide-react";
import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { CourseData } from "@/lib/strapi";

type CourseConsultationFormProps = {
  courses: CourseData[];
  locale: Locale;
  sourcePage: string;
  campaign: string;
  leadSource: string;
  formId?: string;
  defaultTargetCourse?: string;
  showHeading?: boolean;
  initialName?: string;
  initialEmail?: string;
};

type ConsultationFields = {
  name: string;
  email: string;
  learningGoal: string;
  currentLevel: string;
  targetCourse: string;
  timezone: string;
  preferredDate: string;
  preferredTime: string;
};

function todayInputValue() {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  return new Date(today.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

export function CourseConsultationForm({
  courses,
  locale,
  sourcePage,
  campaign,
  leadSource,
  formId,
  defaultTargetCourse,
  showHeading = false,
  initialName = "",
  initialEmail = "",
}: CourseConsultationFormProps) {
  const zh = locale === "zh";
  const [step, setStep] = useState<1 | 2>(1);
  const minDate = todayInputValue();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [fields, setFields] = useState<ConsultationFields>({
    name: initialName,
    email: initialEmail,
    learningGoal: "",
    currentLevel: "",
    targetCourse: defaultTargetCourse ?? "not-sure",
    timezone: "",
    preferredDate: "",
    preferredTime: "",
  });
  const formRef = useRef<HTMLFormElement>(null);

  function updateField(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  function continueToDetails() {
    const form = formRef.current;
    if (!form) return;
    if (form.checkValidity()) {
      setStep(2);
      setError("");
    } else {
      form.reportValidity();
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fields,
          courseSlug: "course-consultation",
          sourcePage,
          campaign,
          leadSource,
          privacyConsent,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setSent(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : zh
            ? "提交失败，请稍后重试。"
            : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id={formId}>
      {showHeading && (
        <>
          <h2 className="text-2xl font-extrabold text-brand-navy sm:text-3xl">
            {zh ? "预约免费中文学习咨询" : "Book a Free Chinese Learning Consultation"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            {zh
              ? "填写你的学习情况和可预约时间，顾问会为你推荐合适的课程。"
              : "Share your learning goals and preferred slot. An advisor will recommend the right course for you."}
          </p>
        </>
      )}
      {sent ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
          <CheckCircle2 className="size-14 text-brand-green" />
          <h3 className="mt-5 text-2xl font-extrabold text-brand-navy">
            {zh ? "咨询预约已提交" : "Consultation request received"}
          </h3>
          <p className="mt-3 max-w-md text-sm leading-7 text-slate-600">
            {zh
              ? "学习顾问会根据你填写的时间和时区联系你，确认最终预约时间。"
              : "A learning advisor will contact you using your preferred details and confirm the final time zone and slot."}
          </p>
        </div>
      ) : (
        <form
          ref={formRef}
          onSubmit={submit}
          className={showHeading ? "mt-6 grid gap-5" : "grid gap-5"}
        >
          <div className="flex items-center gap-3 text-xs font-extrabold text-brand-blue">
            <span className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-brand-blue text-white">1</span>
              {zh ? "基本信息" : "About you"}
            </span>
            <span className="h-px flex-1 bg-brand-line" />
            <span className={step === 2 ? "flex items-center gap-2 text-brand-blue" : "flex items-center gap-2 text-slate-400"}>
              <span className={step === 2 ? "grid size-6 place-items-center rounded-full bg-brand-blue text-white" : "grid size-6 place-items-center rounded-full bg-slate-100 text-slate-400"}>2</span>
              {zh ? "学习安排" : "Your plan"}
            </span>
          </div>

          {step === 1 ? (
            <div className="grid gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-brand-navy">
                  {zh ? "先告诉我们一些基本情况" : "First, tell us a little about you"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {zh ? "只需约30秒，下一步再完善学习安排。" : "It takes about 30 seconds. We’ll ask about your schedule next."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <input required name="name" value={fields.name} onChange={updateField} placeholder={zh ? "姓名" : "Full name"} aria-label={zh ? "姓名" : "Full name"} className="course-input" />
                <input required type="email" name="email" value={fields.email} onChange={updateField} placeholder={zh ? "Email 邮箱" : "Email address"} aria-label={zh ? "Email 邮箱" : "Email address"} className="course-input" />
              </div>
              <select required name="learningGoal" value={fields.learningGoal} onChange={updateField} className="course-input" aria-label={zh ? "学习目标" : "Learning goal"}>
                <option value="" disabled>{zh ? "学习目标" : "Learning goal"}</option>
                <option value="conversation">{zh ? "日常交流" : "Everyday conversation"}</option>
                <option value="hsk">HSK / {zh ? "考试" : "Exam"}</option>
                <option value="business">{zh ? "商务中文" : "Business Chinese"}</option>
                <option value="travel">{zh ? "旅行与文化" : "Travel and culture"}</option>
                <option value="ib">IB Chinese</option>
              </select>
              <button type="button" onClick={continueToDetails} className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white">
                {zh ? "下一步" : "Continue"}
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              <div>
                <h3 className="text-xl font-extrabold text-brand-navy">
                  {zh ? "告诉我们你的学习安排" : "Help us shape your learning plan"}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {zh ? "这些信息帮助顾问安排更合适的课程和时间。" : "These details help an advisor recommend the right course and time."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <select required name="currentLevel" value={fields.currentLevel} onChange={updateField} className="course-input" aria-label={zh ? "当前中文水平" : "Current Chinese level"}>
                  <option value="" disabled>{zh ? "当前中文水平" : "Current Chinese level"}</option>
                  <option value="beginner">{zh ? "初级 / 刚开始" : "Beginner / Just starting"}</option>
                  <option value="intermediate">{zh ? "中级 / 可以简单交流" : "Intermediate / Simple conversations"}</option>
                  <option value="advanced">{zh ? "高级 / 可以深入表达" : "Advanced / Confident expression"}</option>
                  <option value="not-sure">{zh ? "暂不确定" : "Not sure yet"}</option>
                </select>
                <select required name="targetCourse" value={fields.targetCourse} onChange={updateField} className="course-input" aria-label={zh ? "目标课程" : "Target course"}>
                  <option value="not-sure">{zh ? "不知道选什么课程，帮我推荐" : "Not sure which course — recommend one"}</option>
                  {courses.map((course) => (
                    <option key={course.slug} value={course.slug}>{course.title}</option>
                  ))}
                </select>
              </div>
              <select required name="timezone" value={fields.timezone} onChange={updateField} className="course-input" aria-label={zh ? "时区" : "Time zone"}>
                <option value="" disabled>{zh ? "时区" : "Time zone"}</option>
                <option value="Asia/Shanghai">China Standard Time (UTC+8)</option>
                <option value="Asia/Tokyo">Japan Standard Time (UTC+9)</option>
                <option value="Europe/London">London (UTC+0/+1)</option>
                <option value="Europe/Paris">Central Europe (UTC+1/+2)</option>
                <option value="America/New_York">New York (UTC-5/-4)</option>
                <option value="America/Los_Angeles">Los Angeles (UTC-8/-7)</option>
                <option value="Australia/Sydney">Sydney (UTC+10/+11)</option>
                <option value="other">{zh ? "其他时区" : "Other time zone"}</option>
              </select>
              <div className="rounded-2xl border border-brand-line bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-extrabold text-brand-navy">
                  <CalendarDays size={16} className="text-brand-blue" />
                  {zh ? "选择可预约日期和时间段" : "Choose a preferred date and time slot"}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input required type="date" name="preferredDate" value={fields.preferredDate} min={minDate || undefined} onChange={updateField} aria-label={zh ? "预约日期" : "Preferred date"} className="course-input bg-white" />
                  <select required name="preferredTime" value={fields.preferredTime} onChange={updateField} className="course-input bg-white" aria-label={zh ? "预约时间段" : "Preferred time slot"}>
                    <option value="" disabled>{zh ? "选择时间段" : "Choose a time slot"}</option>
                    <option value="09:00-10:00">09:00–10:00</option>
                    <option value="11:00-12:00">11:00–12:00</option>
                    <option value="14:00-15:00">14:00–15:00</option>
                    <option value="16:00-17:00">16:00–17:00</option>
                    <option value="19:00-20:00">19:00–20:00</option>
                  </select>
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {zh ? "以上为意向时间，顾问会按你的时区确认最终时间。" : "This is a preferred slot; the advisor will confirm the final time in your time zone."}
                </p>
              </div>
              <label className="flex items-start gap-3 text-xs leading-5 text-slate-500">
                <input required name="privacyConsent" type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" />
                {zh ? "我同意 SureMandarin 就本次咨询与我联系。" : "I agree that SureMandarin may contact me about this consultation."}
              </label>
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">{error}</p>}
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <button type="button" onClick={() => setStep(1)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-brand-blue px-5 text-sm font-extrabold text-brand-blue">
                  <ArrowLeft size={16} />
                  {zh ? "返回" : "Back"}
                </button>
                <button disabled={submitting} className="brand-gradient inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-extrabold text-white disabled:opacity-60">
                  {submitting ? (zh ? "正在提交…" : "Sending…") : (zh ? "提交免费咨询" : "Book my free consultation")}
                  <Send size={16} />
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

export function CourseConsultation({
  courses,
  locale,
  sourcePage,
  campaign = "courses-consultation",
  leadSource = "courses-page",
}: {
  courses: CourseData[];
  locale: Locale;
  sourcePage?: string;
  campaign?: string;
  leadSource?: string;
}) {
  const zh = locale === "zh";
  return (
    <section id="consultation" className="sm-course-consultation mt-20 overflow-hidden rounded-[2rem] border border-brand-line bg-white shadow-xl shadow-blue-900/10">
      <div className="grid lg:grid-cols-[.82fr_1.18fr]">
        <div className="brand-gradient relative overflow-hidden p-7 text-white sm:p-10">
          <div className="absolute -right-16 -top-16 size-48 rounded-full border border-white/20 bg-white/10" />
          <div className="absolute -bottom-20 -left-12 size-56 rounded-full border border-white/15 bg-white/5" />
          <p className="relative text-xs font-extrabold uppercase tracking-[.2em] text-cyan-100">{zh ? "免费学习规划" : "Free learning planning"}</p>
          <h2 className="relative mt-4 max-w-md text-3xl font-extrabold leading-tight sm:text-4xl">{zh ? "预约免费中文学习咨询" : "Book a Free Chinese Learning Consultation"}</h2>
          <p className="relative mt-5 max-w-md text-sm leading-7 text-blue-50 sm:text-base">{zh ? "告诉我们你的目标和时间，顾问会根据你的情况推荐课程和学习节奏。" : "Share your goals and schedule. A learning advisor will recommend the right course and rhythm."}</p>
          <div className="relative mt-7 grid gap-3 text-sm font-bold text-white/90">
            <span className="flex items-center gap-2"><CheckCircle2 size={17} />{zh ? "免费 · 无需付款" : "Free · No obligation"}</span>
            <span className="flex items-center gap-2"><Clock3 size={17} />{zh ? "我们通常会在一个工作日内回复" : "We normally reply within one working day"}</span>
            <span className="flex items-center gap-2"><CalendarDays size={17} />{zh ? "选择意向日期和时间段" : "Choose a preferred date and time"}</span>
          </div>
        </div>
        <div className="p-6 sm:p-10"><CourseConsultationForm courses={courses} locale={locale} sourcePage={sourcePage ?? "/" + locale + "/courses"} campaign={campaign} leadSource={leadSource} /></div>
      </div>
    </section>
  );
}
