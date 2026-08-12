import Image from "next/image";
import { Star } from "lucide-react";
import { SectionHeading } from "./SectionHeading";
import { TestimonialSubmission } from "./TestimonialSubmission";
import type { TestimonialData } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

const testimonialPortraitByName: Record<string, string> = {
  "Sophie Martin": "/images/testimonials/sophie-martin.png",
  "Kevin Tan": "/images/testimonials/kevin-tan.png",
  "Carla Rodriguez": "/images/testimonials/carla-rodriguez.png",
  "Lucas Miller": "/images/testimonials/lucas-miller.png",
};

export function Testimonials({
  testimonials,
  title,
  locale = "en",
  showSubmission = false,
}: {
  testimonials: TestimonialData[];
  title: string;
  locale?: Locale;
  showSubmission?: boolean;
}) {
  const visibleTestimonials = testimonials.slice(0, 4).map((student) => ({
    ...student,
    image: testimonialPortraitByName[student.name] ?? student.image,
  }));
  return (
    <section id="testimonials" className="sm-home-testimonials py-24">
      <div className="page-shell">
        <SectionHeading
          kicker=""
          title={title}
          text={
            locale === "zh"
              ? "来自全球学习社区的真实故事。"
              : "Stories from our global learning community."
          }
        />
        <div className="sm-home-testimonial-grid grid gap-5 md:grid-cols-2">
          {visibleTestimonials.map((student) => (
            <article
              key={student.id}
              className="sm-home-testimonial-card rounded-2xl border border-brand-line p-6"
            >
              <div className="grid grid-cols-[80px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[96px_minmax(0,1fr)] sm:gap-5">
                <Image
                  src={student.image}
                  alt={`Portrait of ${student.name}`}
                  width={96}
                  height={96}
                  sizes="(min-width: 640px) 96px, 80px"
                  className="size-20 rounded-full object-cover ring-4 ring-blue-50 sm:size-24"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div>
                      <strong className="block text-base font-extrabold text-brand-navy">
                        {student.name}
                      </strong>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {student.country}
                      </span>
                    </div>
                    <div
                      className="flex gap-1 text-brand-orange"
                      aria-label={
                        locale === "zh"
                          ? `${student.rating} 星（满分 5 星）`
                          : `${student.rating} out of 5 stars`
                      }
                    >
                      {Array.from({ length: student.rating }).map((_, i) => (
                        <Star key={i} size={15} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <blockquote className="mt-3 text-sm leading-6 text-slate-500">
                    “{student.quote}”
                  </blockquote>
                  {(student.result || student.goal || student.duration) && (
                    <div className="mt-4 rounded-xl bg-brand-soft p-3 text-xs leading-5 text-slate-600">
                      {student.result && (
                        <p className="font-bold text-brand-navy">{student.result}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                        {student.goal && <span>{locale === "zh" ? "目标" : "Goal"}: {student.goal}</span>}
                        {student.duration && <span>{locale === "zh" ? "周期" : "Duration"}: {student.duration}</span>}
                      </div>
                      {student.verified && (
                        <span className="mt-2 inline-flex font-bold text-emerald-700">
                          {locale === "zh" ? "已验证学员" : "Verified learner"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
        {showSubmission && <TestimonialSubmission locale={locale} />}
      </div>
    </section>
  );
}
