import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, SlidersHorizontal } from "lucide-react";
import type { CourseData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";
import { CourseConsultation } from "@/components/site/CourseConsultation";

export function CourseCatalog({
  courses,
  locale,
}: {
  courses: CourseData[];
  locale: Locale;
}) {
  const zh = locale === "zh";
  return (
    <section className="sm-course-catalog soft-gradient py-16 sm:py-24">
      <div className="page-shell">
        <div className="max-w-3xl">
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            {zh ? "找到适合你的中文课程" : "Find your way to confident Chinese"}
          </h1>
          <p className="mt-5 text-base leading-8 text-slate-600">
            {zh
              ? "从一对一私教到游学、IB 和企业定制课程，按照你的目标、时间和学习方式选择。"
              : "From private coaching to travel, IB and bespoke programs, choose a course around your goals, schedule and learning style."}
          </p>
        </div>
        <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-line bg-white p-4 text-sm font-bold text-brand-navy">
          <SlidersHorizontal size={18} className="text-brand-blue" />
          {zh
            ? "按目标、水平和授课方式筛选"
            : "Filter by goal, level and delivery mode"}
          <span className="ml-auto text-xs text-slate-400">
            {courses.length} {zh ? "个课程" : "courses"}
          </span>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <article
              key={course.id}
              className="group overflow-hidden rounded-3xl border border-brand-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <Link href={`/${locale}/courses/${course.slug}`}>
                <div className="relative h-56 overflow-hidden">
                  <Image
                    src={course.image}
                    alt={course.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </Link>
              <div className="p-7">
                <p className="text-xs font-extrabold uppercase tracking-widest text-brand-blue">
                  {course.category}
                </p>
                <h2 className="mt-3 text-xl font-extrabold text-brand-navy">
                  <Link href={`/${locale}/courses/${course.slug}`}>
                    {course.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {course.summary}
                </p>
                <ul className="mt-5 grid gap-2 text-xs font-semibold text-slate-600">
                  <li className="flex gap-2">
                    <CheckCircle2 size={15} className="text-brand-green" />
                    {zh ? "专业教师指导" : "Expert teacher guidance"}
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={15} className="text-brand-green" />
                    {zh ? "可按目标定制" : "Designed around your goals"}
                  </li>
                </ul>
                <Link
                  href={`/${locale}/courses/${course.slug}`}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-extrabold text-brand-blue"
                >
                  {zh ? "查看课程详情" : "View course details"}
                  <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <CourseConsultation courses={courses} locale={locale} />
      </div>
    </section>
  );
}
