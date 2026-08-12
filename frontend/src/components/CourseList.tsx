import Image from "next/image";
import {
  ArrowRight,
  BriefcaseBusiness,
  GraduationCap,
  Laptop,
  Plane,
  UserRound,
  UsersRound,
} from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import type { CourseData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

const categoryPresentation = {
  private: { icon: UserRound, color: "text-brand-blue" },
  group: { icon: UsersRound, color: "text-brand-blue" },
  "learn-travel": { icon: Plane, color: "text-brand-green" },
  "ib-tutorial": { icon: GraduationCap, color: "text-brand-green" },
  online: { icon: Laptop, color: "text-brand-orange" },
  exclusive: { icon: BriefcaseBusiness, color: "text-brand-orange" },
};

export function CourseList({
  courses,
  title,
  locale = "en",
}: {
  courses: CourseData[];
  title: string;
  locale?: Locale;
}) {
  return (
    <section id="courses" className="sm-home-courses py-24">
      <div className="page-shell">
        <SectionHeading
          kicker=""
          title={title}
          text={
            locale === "zh"
              ? "为不同目标、水平和时间安排提供灵活选择。"
              : "Flexible options for every goal, level, and schedule."
          }
        />
        <div className="sm-home-course-grid grid gap-5 lg:grid-cols-2">
          {courses.map((course, index) => {
            const presentation =
              categoryPresentation[
                course.category as keyof typeof categoryPresentation
              ] ?? categoryPresentation.private;
            const Icon = presentation.icon;
            return (
              <article
                key={course.id}
                className="sm-home-course-card grid min-h-64 overflow-hidden rounded-2xl border border-brand-line bg-white sm:grid-cols-[1fr_1.05fr] hover:shadow-xl hover:shadow-blue-950/10"
              >
                <div className="p-7">
                  <div
                    className={`flex items-center gap-3 text-2xl font-extrabold ${presentation.color}`}
                  >
                    <Icon size={25} /> {String(index + 1).padStart(2, "0")}
                  </div>
                  <h3 className="mt-4 text-xl font-bold text-brand-navy">
                    {course.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {course.summary}
                  </p>
                  <a
                    href={`/${locale}/courses/${course.slug}`}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-blue"
                  >
                    {locale === "zh" ? "了解详情" : "Learn more"}{" "}
                    <ArrowRight size={15} />
                  </a>
                </div>
                <div className="relative min-h-52">
                  <Image
                    src={course.image}
                    alt={course.imageAlt}
                    fill
                    sizes="(max-width: 640px) 100vw, 25vw"
                    className="object-cover"
                  />
                </div>
              </article>
            );
          })}
        </div>
        <a
          href={`/${locale}/courses`}
          className="mx-auto mt-10 table rounded-lg border border-brand-blue px-6 py-3 text-sm font-bold text-brand-blue hover:bg-brand-blue hover:text-white"
        >
          {locale === "zh" ? "查看全部课程" : "View All Courses"}
        </a>
      </div>
    </section>
  );
}
