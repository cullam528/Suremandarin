"use client";

import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardCheck,
  ChevronDown,
  Clock3,
  Globe2,
  GraduationCap,
  HeartHandshake,
  Laptop2,
  Map,
  MessageCircle,
  Sparkles,
  Star,
  TrendingUp,
  UsersRound,
  Users2,
} from "lucide-react";
import { useState } from "react";
import type { CourseDetailData } from "@/lib/strapi";
import { getLocalizedCoursePageContent } from "@/lib/course-content";
import type { Locale } from "@/lib/i18n";
import { CourseConsultationForm } from "@/components/site/CourseConsultation";

const audiences = [
  [
    "Busy Professionals",
    "Improve communication skills for work, meetings and presentations.",
    Laptop2,
  ],
  [
    "Students",
    "Build a strong foundation or get ahead for school and exams.",
    GraduationCap,
  ],
  [
    "Expats & Partners",
    "Adapt to life in China and connect with local communities.",
    HeartHandshake,
  ],
  [
    "Travelers",
    "Learn practical Chinese for smooth and confident travel.",
    Globe2,
  ],
  [
    "Hobby Learners",
    "Explore Chinese culture and enjoy learning at your own pace.",
    Sparkles,
  ],
];
const faqs = [
  [
    "How are the lessons conducted?",
    "Lessons are conducted one-to-one online with an experienced native Chinese teacher.",
  ],
  [
    "What learning materials do you use?",
    "Your teacher selects digital materials based on your level, interests and goals.",
  ],
  [
    "What if I need to reschedule a lesson?",
    "Contact your learning advisor in advance and we will help arrange another suitable time.",
  ],
  [
    "How long does it take to see progress?",
    "Most learners notice greater confidence after several weeks of consistent study.",
  ],
  [
    "Do you offer group courses?",
    "Yes. SureMandarin also offers small-group courses.",
  ],
  [
    "What is your cancellation policy?",
    "Your learning advisor will explain the applicable terms before enrollment.",
  ],
];
const zhFaqs = [
  [
    "课程如何进行？",
    "课程由经验丰富的中文母语教师在线授课，并根据课程类型采用一对一或小班形式。",
  ],
  [
    "课程使用哪些学习材料？",
    "老师会根据你的中文水平、兴趣和目标选择合适的数字化教材。",
  ],
  [
    "临时需要调整上课时间怎么办？",
    "请提前联系学习顾问，我们会协助安排其他合适时间。",
  ],
  [
    "多久可以看到进步？",
    "坚持学习数周后，大多数学员都会感受到表达自信和实际能力的提升。",
  ],
  ["是否提供小班课程？", "是的，SureMandarin 同时提供互动性强的精品小班课程。"],
  [
    "取消课程有什么规定？",
    "报名之前，学习顾问会向你清楚说明相应的取消和调整规则。",
  ],
];
const roadmapIcons = [ClipboardCheck, Map, BookOpen, TrendingUp, Sparkles] as const;
const testimonialPortraitByName: Record<string, string> = {
  "Patty Willis": "/images/testimonials/patty-willis.png",
  "Daniel Aylmer": "/images/testimonials/daniel-aylmer.png",
  "Sophie Martin": "/images/testimonials/sophie-martin.png",
  "Kevin Tan": "/images/testimonials/kevin-tan.png",
  "Carla Rodriguez": "/images/testimonials/carla-rodriguez.png",
  "Lucas Miller": "/images/testimonials/lucas-miller.png",
  "Aisha Rahman": "/images/testimonials/aisha-rahman.png",
  "Marco Bianchi": "/images/testimonials/marco-bianchi.png",
  "Emily Johnson": "/images/testimonials/emily-johnson.png",
  "Hana Suzuki": "/images/testimonials/hana-suzuki.jpg",
};
function benefitIconFor(title: string, index: number) {
  const value = title.toLowerCase();
  if (/bespoke|custom|personal|plan|方案|个性|ib-aligned|small class|小班/.test(value)) {
    return Sparkles;
  }
  if (/team|teacher|expert|facilitat|premium|specialist|dedicated|peer|教师|团队|支持/.test(value)) {
    return UsersRound;
  }
  if (/schedule|delivery|flexible|location|travel support|安排|灵活|旅行|服务/.test(value)) {
    return CalendarDays;
  }
  if (/progress|result|feedback|strategy|practical|resource|motivation|exam|achievement|进步|成果|反馈|策略|资源/.test(value)) {
    return TrendingUp;
  }
  return [Sparkles, UsersRound, BookOpen, HeartHandshake][index] ?? Sparkles;
}

export function CourseDetail({
  data,
  locale = "en",
  initialName = "",
  initialEmail = "",
  leadSource = "course-detail",
  campaign = "course-detail-consultation",
}: {
  data: CourseDetailData;
  locale?: Locale;
  initialName?: string;
  initialEmail?: string;
  leadSource?: string;
  campaign?: string;
}) {
  const [openFaq, setOpenFaq] = useState(0);
  const zh = locale === "zh";
  const pageFaqs = zh ? zhFaqs : faqs;
  const page = getLocalizedCoursePageContent(data.course.slug, locale);
  const pageBenefits = page.benefits;
  const pageAudiences = page.audiences.map(
    (item, index) =>
      [item[0], item[1], audiences[index]?.[2] ?? Sparkles] as const,
  );
  return (
    <div className="sm-course-detail">
      <section id="course-top" className="sm-course-hero course-hero overflow-hidden">
        <div className="sm-course-hero-grid page-shell grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
          <div>
            <p className="section-kicker inline-flex rounded-full bg-blue-50 px-4 py-2">
              {page.label}
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-[-.045em] text-brand-navy sm:text-5xl lg:text-[3.5rem]">
              {page.title}
              <br />
              <span className="text-brand-green">{page.accent}</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-600">
              {page.description}
            </p>
            <dl className="mt-7 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              {[
                [Users2, page.facts[0]],
                [GraduationCap, page.facts[1]],
                [Laptop2, page.facts[2]],
                [Clock3, page.facts[3]],
              ].map(([Icon, label], i) => (
                <div
                  key={i}
                  className="border-r border-brand-line p-3 text-center last:border-0"
                >
                  <Icon className="mx-auto mb-2 text-brand-green" size={24} />
                  <dd className="text-xs font-bold text-brand-navy">
                    {String(label)}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm font-bold text-brand-navy">
              <span className="text-brand-orange">★★★★★</span> &nbsp;
              {page.rating} &nbsp;{" "}
              <span className="text-brand-green">★ Trustpilot</span>
            </p>
          </div>
          <div className="relative lg:pl-10">
            <div className="mx-auto w-full max-w-[520px] rounded-[2rem] border border-brand-line bg-white p-5 shadow-2xl sm:p-7">
              <CourseConsultationForm
                formId="consult"
                courses={[data.course]}
                locale={locale}
                sourcePage={`/courses/${data.course.slug}`}
                defaultTargetCourse={data.course.slug}
                showHeading
                initialName={initialName}
                initialEmail={initialEmail}
                leadSource={leadSource}
                campaign={campaign}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-20 text-center">
        <h2 className="text-3xl font-extrabold text-brand-navy">
          {zh ? "为什么选择 SureMandarin" : "Why learn with SureMandarin"}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pageBenefits.map(([title, copy], i) => {
              const BenefitIcon = benefitIconFor(title, i);
              return (
              <article
                key={title}
                className="rounded-2xl border border-brand-line bg-white p-7 text-left shadow-sm"
              >
                <span className="mb-5 grid size-12 place-items-center rounded-xl bg-blue-50">
                  <BenefitIcon aria-hidden="true" className="text-brand-blue" size={25} strokeWidth={2.25} />
                </span>
                <h3 className="font-extrabold text-brand-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{copy}</p>
              </article>
              );
            })}
        </div>
      </section>

      <section className="bg-brand-soft py-20">
        <div className="page-shell text-center">
          <h2 className="text-3xl font-extrabold text-brand-navy">
            {zh ? "这门课程适合你吗？" : "Is this course right for you?"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
            {page.audienceIntro}
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {pageAudiences.map(([title, copy, Icon]) => (
              <article
                key={String(title)}
                className="rounded-2xl bg-white p-6 text-left shadow-sm"
              >
                <Icon className="text-brand-blue" size={28} />
                <h3 className="mt-5 font-extrabold text-brand-navy">
                  {String(title)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {String(copy)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-12 py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-3xl font-extrabold text-brand-navy">
            {zh ? "你将获得什么" : "What you will achieve"}
          </h2>
          <ul className="mt-7 grid gap-4">
            {page.achievements.map((item) => (
              <li
                key={item}
                className="flex gap-3 font-semibold text-brand-navy"
              >
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={15} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[2rem] bg-gradient-to-br from-blue-50 to-cyan-50 p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              [
                MessageCircle,
                zh ? "个性化学习方案" : "Personalized Learning Plans",
              ],
              [
                HeartHandshake,
                zh ? "经验丰富的母语教师" : "Experienced Native Teachers",
              ],
              [Globe2, zh ? "灵活安排课程" : "Flexible Scheduling"],
              [Star, zh ? "真实可见的学习成果" : "Proven Results"],
            ].map(([Icon, title]) => (
              <div
                key={String(title)}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <Icon className="text-brand-blue" />
                <h3 className="mt-4 font-extrabold text-brand-navy">
                  {String(title)}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="roadmap" className="bg-brand-soft py-20">
        <div className="page-shell text-center">
          <h2 className="section-title mt-3">
            {zh ? "你的个性化学习路径" : "Your personalized learning roadmap"}
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-5">
            {page.roadmap.map((item, i) => (
              <article
              key={item}
              className="relative rounded-2xl bg-white p-6 shadow-sm"
            >
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-blue-50">
                {(() => {
                  const RoadmapIcon = roadmapIcons[i] ?? Sparkles;
                  return <RoadmapIcon aria-hidden="true" className="text-brand-blue" size={25} strokeWidth={2.25} />;
                })()}
              </span>
                <p className="mt-4 text-xs font-extrabold text-brand-blue">
                  {zh ? `第 ${i + 1} 步` : `STEP ${i + 1}`}
                </p>
                <h3 className="mt-1 font-extrabold text-brand-navy">{item}</h3>
                {i < 4 && (
                  <ArrowRight className="absolute -right-5 top-10 z-10 hidden text-brand-cyan md:block" />
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-20 text-center">
        <h2 className="section-title mt-3">
          {zh ? "每节课如何进行" : "How each lesson works"}
        </h2>
        <div className="mt-12 grid gap-3 md:grid-cols-5">
          {page.lessonFlow.map((item, i) => (
            <article
              key={item}
              className="rounded-2xl border border-brand-line p-5"
            >
              <span className="text-3xl font-extrabold text-blue-100">
                0{i + 1}
              </span>
              <h3 className="mt-3 font-bold text-brand-navy">{item}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="soft-gradient py-20">
        <div className="page-shell grid items-center gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <Image
            src="/course-detail/images/teacher-jessica.webp"
            alt="SureMandarin teacher Jessica"
            width={600}
            height={720}
            className="mx-auto h-[480px] w-full max-w-md rounded-[2rem] object-cover object-top shadow-xl"
          />
          <div>
            <p className="section-kicker">
              {zh ? "认识你的老师" : "Meet your teacher"}
            </p>
            <h2 className="section-title mt-3">
              {zh
                ? "专业教学，更有温度的连接。"
                : "Expert teaching. Human connection."}
            </h2>
            <p className="mt-5 text-lg font-bold text-brand-navy">
              {zh ? "Jessica · 资深中文教师" : "Jessica · Senior Mandarin Teacher"}
            </p>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              {zh
                ? "“我的目标，是让每位学员都能安心开口、保持探索的好奇，并为每一步进步感到自豪。”"
                : "“My goal is to make every learner feel safe to speak, curious to explore and proud of each step forward.”"}
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {(zh
                ? ["18 年以上教学经验", "HSK 专业辅导", "双语学习支持"]
                : ["18+ years teaching", "HSK specialist", "Bilingual support"]
              ).map((item) => (
                <span
                  key={item}
                  className="rounded-xl bg-white p-4 text-sm font-bold text-brand-navy shadow-sm"
                >
                  <CheckCircle2 className="mb-2 text-brand-green" size={20} />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell py-20 text-center">
        <h2 className="section-title mt-3">
          {zh ? "学员怎么说" : "What our students say"}
        </h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {data.testimonials.slice(0, 3).map((item) => (
            <figure
              key={item.id}
              className="rounded-2xl border border-brand-line p-7 text-left shadow-sm"
            >
              <div className="flex gap-1 text-brand-orange">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <blockquote className="mt-5 leading-7 text-slate-600">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Image
                  src={testimonialPortraitByName[item.name] ?? item.image}
                  alt={item.name}
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                />
                <span className="text-sm">
                  <strong className="block text-brand-navy">{item.name}</strong>
                  {item.country}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="bg-brand-soft py-20">
        <div className="page-shell max-w-4xl">
          <div className="text-center">
            <h2 className="section-title mt-3">
              {zh ? "常见问题" : "Frequently asked questions"}
            </h2>
          </div>
          <div className="mt-10 grid gap-3 md:grid-cols-2">
            {pageFaqs.map(([q, a], i) => (
              <article key={q} className="rounded-2xl bg-white shadow-sm">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  className="flex w-full items-center justify-between gap-5 p-5 text-left font-extrabold text-brand-navy"
                  aria-expanded={openFaq === i}
                >
                  {q}
                  <ChevronDown
                    className={`shrink-0 transition ${openFaq === i ? "rotate-180" : ""}`}
                  />
                </button>
                {openFaq === i && (
                  <p className="px-5 pb-5 text-sm leading-7 text-slate-600">
                    {a}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-shell py-20">
        <div className="brand-gradient overflow-hidden rounded-[2rem] px-7 py-12 text-center text-white shadow-xl sm:px-12">
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
            {zh
              ? "准备开始你的中文学习之旅了吗？"
              : "Ready to start your Chinese journey?"}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-blue-50">
            {zh
              ? "立即预约免费咨询，由专业教师为你制定个性化学习方案。"
              : "Book your free consultation now and get a personalized learning plan from one of our expert teachers."}
          </p>
          <a
            href="#consult"
            className="mt-7 inline-flex rounded-xl bg-white px-7 py-3.5 font-extrabold text-brand-blue"
          >
            {zh ? "预约免费咨询" : "Book My Free Consultation"}
          </a>
        </div>
      </section>
      <a
        href="#consult"
        className="brand-gradient fixed inset-x-4 bottom-4 z-40 rounded-xl py-3 text-center font-extrabold text-white shadow-xl lg:hidden"
      >
        {zh ? "预约免费咨询" : "Book a free consultation"}
      </a>
    </div>
  );
}
