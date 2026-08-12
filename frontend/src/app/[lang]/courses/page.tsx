import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseCatalog } from "@/components/site/CourseCatalog";
import { StructuredData } from "@/components/seo/StructuredData";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getHomepageData } from "@/lib/strapi";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang)
    ? pageMetadata({
        locale: lang,
        title:
          lang === "zh"
            ? "中文培训课程 | SureMandarin"
            : "Chinese Courses | SureMandarin",
        description:
          lang === "zh"
            ? "浏览 SureMandarin 一对一、小组、游学、IB、在线和专属中文培训课程，找到适合你的学习方案。"
            : "Explore SureMandarin private, group, travel, IB, online, and exclusive Chinese courses for your goals.",
        path: "/courses",
      })
    : {};
}
export default async function CoursesPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const data = await getHomepageData(lang);
  return (
    <SiteShell locale={lang}>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: lang === "zh" ? "SureMandarin 中文培训课程" : "SureMandarin Chinese courses",
            itemListElement: data.courses.map((course, index) => ({
              "@type": "ListItem",
              position: index + 1,
              item: {
                "@type": "Course",
                name: course.title,
                description: course.summary,
                url: absoluteUrl(`/${lang}/courses/${course.slug}`),
                provider: { "@type": "EducationalOrganization", name: "SureMandarin" },
              },
            })),
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "课程" : "Courses", path: `/${lang}/courses` },
          ]),
        ]}
      />
      <CourseCatalog courses={data.courses} locale={lang} />
    </SiteShell>
  );
}
