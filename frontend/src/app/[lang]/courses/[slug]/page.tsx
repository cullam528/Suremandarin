import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactWidget } from "@/components/ContactWidget";
import { CourseDetail } from "@/components/course-detail/CourseDetail";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getCourseDetailData } from "@/lib/strapi";
import { StructuredData } from "@/components/seo/StructuredData";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const d = await getCourseDetailData(slug, lang);
  return d
    ? pageMetadata({
        locale: lang,
        title: `${d.course.title} | SureMandarin`,
        description: d.course.summary,
        path: `/courses/${slug}`,
        image: d.course.image,
      })
    : pageMetadata({
        locale: lang,
        title: lang === "zh" ? "中文课程 | SureMandarin" : "Chinese Course | SureMandarin",
        description: lang === "zh" ? "了解 SureMandarin 中文课程。" : "Explore a SureMandarin Chinese course.",
        path: `/courses/${slug}`,
      });
}
export default async function LocalizedCourse({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<{
    name?: string;
    email?: string;
    leadSource?: string;
    campaign?: string;
  }>;
}) {
  const { lang, slug } = await params;
  const query = await searchParams;
  if (!isLocale(lang)) notFound();
  const d = await getCourseDetailData(slug, lang);
  if (!d) notFound();
  const courseUrl = absoluteUrl(`/${lang}/courses/${slug}`);
  const courseImage = d.course.image.startsWith("http")
    ? d.course.image
    : absoluteUrl(d.course.image);
  return (
    <>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Course",
            "@id": `${courseUrl}#course`,
            name: d.course.title,
            description: d.course.summary,
            url: courseUrl,
            image: courseImage,
            inLanguage: lang === "zh" ? "zh-CN" : "en",
            provider: {
              "@type": "EducationalOrganization",
              name: "SureMandarin",
              url: absoluteUrl("/"),
            },
            educationalLevel: d.course.level,
            audience: { "@type": "Audience", audienceType: d.course.audience },
            hasCourseInstance: {
              "@type": "CourseInstance",
              courseMode: d.course.deliveryMode,
              duration: d.course.duration,
            },
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "课程" : "Courses", path: `/${lang}/courses` },
            { name: d.course.title, path: `/${lang}/courses/${slug}` },
          ]),
        ]}
      />
      <Header settings={d.global} locale={lang} />
      <main>
        <CourseDetail
          data={d}
          locale={lang}
          initialName={typeof query.name === "string" ? query.name : ""}
          initialEmail={typeof query.email === "string" ? query.email : ""}
          leadSource={
            typeof query.leadSource === "string"
              ? query.leadSource
              : "course-detail"
          }
          campaign={
            typeof query.campaign === "string"
              ? query.campaign
              : "course-detail-consultation"
          }
        />
      </main>
      <ContactWidget
        settings={{
          ...d.global,
          contactTitle: lang === "zh" ? "联系我们" : d.global.contactTitle,
        }}
      />
      <Footer settings={d.global} locale={lang} />
    </>
  );
}
