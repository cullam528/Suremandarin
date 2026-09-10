import Link from "next/link";
import { ArrowRight, BookOpen, CircleHelp } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import type { CourseData } from "@/lib/strapi";
import { getCourseComparisons } from "@/lib/learning-guide";

export function LearningGuide({
  locale,
  courses,
}: {
  locale: Locale;
  courses: CourseData[];
}) {
  const zh = locale === "zh";
  const availableCourses = new Map(courses.map((course) => [course.slug, course]));
  const comparisons = getCourseComparisons(locale).filter((course) =>
    availableCourses.has(course.slug),
  );

  if (comparisons.length === 0) return null;

  return (
    <section
      id="course-guide"
      aria-labelledby="course-guide-title"
      className="mt-14 scroll-mt-28 rounded-3xl border border-brand-line bg-white p-5 sm:p-8"
    >
      <h2
        id="course-guide-title"
        className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl"
      >
        {zh ? "哪种中文课程适合你？" : "Which Chinese course fits your goals?"}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        {zh
          ? "先考虑学习目标，再选择授课形式。“一对一”是单独指导，“在线”是远程上课，两者可以结合。以下对比帮助你缩小选择范围，具体安排可在免费咨询时确认。"
          : "Start with your goal, then choose how to learn. Private means individual tuition; online means learning remotely, so a lesson can be both. Use this comparison to narrow your choice, then confirm the details during a free consultation."}
      </p>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-brand-line">
        <table className="w-full min-w-[600px] table-fixed text-left text-sm">
          <caption className="sr-only">
            {zh ? "中文课程的适合人群与学习重点对比" : "Chinese courses compared by learner goals and learning focus"}
          </caption>
          <thead className="bg-slate-50 text-brand-navy">
            <tr>
              <th scope="col" className="w-[25%] px-4 py-3 font-extrabold">{zh ? "课程" : "Course"}</th>
              <th scope="col" className="w-[33%] px-4 py-3 font-extrabold">{zh ? "适合你，如果……" : "Consider it if…"}</th>
              <th scope="col" className="px-4 py-3 font-extrabold">{zh ? "学习重点" : "Learning focus"}</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((course) => (
              <tr key={course.slug} className="border-t border-brand-line align-top">
                <th scope="row" className="px-4 py-4 font-bold">
                  <Link
                    href={`/${locale}/courses/${course.slug}`}
                    className="text-brand-blue underline decoration-blue-200 underline-offset-4 hover:decoration-brand-blue"
                  >
                    {availableCourses.get(course.slug)?.title || course.name}
                  </Link>
                </th>
                <td className="px-4 py-4 leading-6 text-slate-600">{course.audience}</td>
                <td className="px-4 py-4 leading-6 text-slate-600">{course.focus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 sm:hidden">
        {zh ? "左右滑动查看完整课程对比。" : "Swipe the table to compare all details."}
      </p>
      <nav
        aria-label={zh ? "选课帮助" : "Help choosing a course"}
        className="mt-6 flex flex-wrap gap-x-6 gap-y-4 text-sm font-bold text-brand-blue"
      >
        <Link href={`/${locale}/level-test`} className="inline-flex items-center gap-2 hover:underline">
          <BookOpen size={17} aria-hidden="true" />
          {zh ? "先测测我的中文水平" : "Check my Chinese level"}
        </Link>
        <Link href={`/${locale}/faq`} className="inline-flex items-center gap-2 hover:underline">
          <CircleHelp size={17} aria-hidden="true" />
          {zh ? "查看费用、时区与选课问答" : "Questions about fees, timing and courses"}
        </Link>
        <Link href={`/${locale}/contact`} className="inline-flex items-center gap-2 hover:underline">
          {zh ? "与学习顾问聊聊" : "Talk to a learning advisor"}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </nav>
    </section>
  );
}
