import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactWidget } from "@/components/ContactWidget";
import { CourseDetail } from "@/components/course-detail/CourseDetail";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { isLocale, type Locale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getCourseDetailData, getHomepageData } from "@/lib/strapi";
import { languagePaths } from "@/lib/content-seo";
import { StructuredData, SiteStructuredData } from "@/components/seo/StructuredData";

async function getCourseLanguagePaths(id: string, slug: string, locale: Locale) {
  const otherLocale: Locale = locale === "en" ? "zh" : "en";
  const otherHome = await getHomepageData(otherLocale);
  const translation = otherHome.courses.find((item) => item.id === id)
    ?? otherHome.courses.find((item) => item.slug === slug);
  const paths: Array<{ locale: Locale; path: string }> = [
    { locale, path: `/${locale}/courses/${slug}` },
  ];
  if (translation && translation.seo?.noIndex !== true) {
    paths.push({ locale: otherLocale, path: `/${otherLocale}/courses/${translation.slug}` });
  }
  return paths;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const d = await getCourseDetailData(slug, lang);
  if (!d) notFound();
  return pageMetadata({
        locale: lang,
        title: lang === "en" && !/chinese|mandarin/i.test(d.course.title)
          ? `${d.course.title} — Learn Mandarin | SureMandarin` : `${d.course.title} | SureMandarin`,
        description: d.course.summary,
        path: `/courses/${slug}`,
        image: d.course.image,
        imageAlt: d.course.imageAlt,
        seo: d.course.seo,
        languageAlternates: languagePaths(await getCourseLanguagePaths(d.course.id, slug, lang)),
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
  const translations = await getCourseLanguagePaths(d.course.id, slug, lang);
  const languageUrls: Record<Locale, string> = {
    en: "/en/courses",
    zh: "/zh/courses",
    ...Object.fromEntries(translations.map((item) => [item.locale, item.path])),
  };
  const courseUrl = absoluteUrl(`/${lang}/courses/${slug}`);
  const courseImage = d.course.image.startsWith("http")
    ? d.course.image
    : absoluteUrl(d.course.image);
  return (
    <>
      <SiteStructuredData locale={lang} global={d.global} />
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
              "@id": absoluteUrl("/#organization"),
              name: "SureMandarin",
              url: absoluteUrl("/"),
            },
            educationalLevel: d.course.level,
            audience: { "@type": "Audience", audienceType: d.course.audience },
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "课程" : "Courses", path: `/${lang}/courses` },
            { name: d.course.title, path: `/${lang}/courses/${slug}` },
          ]),
        ]}
      />
      <Header settings={d.global} locale={lang} languageUrls={languageUrls} />
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
      <Footer settings={d.global} locale={lang} languageUrls={languageUrls} />
    </>
  );
}
