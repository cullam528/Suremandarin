import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactWidget } from "@/components/ContactWidget";
import { CourseList } from "@/components/CourseList";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { KnowledgeCenter } from "@/components/KnowledgeCenter";
import { Newsletter } from "@/components/Newsletter";
import { SiteStructuredData } from "@/components/seo/StructuredData";
import { Testimonials } from "@/components/Testimonials";
import { isLocale, locales } from "@/lib/i18n";
import { languagePaths } from "@/lib/content-seo";
import { pageMetadata, seoCopy } from "@/lib/seo";
import { getHomepageData, getHomepageSettings } from "@/lib/strapi";
export async function generateStaticParams() {
  return [{ lang: "en" }, { lang: "zh" }];
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const homes = await Promise.all(locales.map((locale) => getHomepageSettings(locale)));
  const d = homes[locales.indexOf(lang)];
  return pageMetadata({
    locale: lang,
    title: ["SureMandarin Chinese Learning", "SureMandarin 中文学习"].includes(d.pageTitle) ? seoCopy[lang].title : d.pageTitle,
    description: ["Personalized Chinese learning for students worldwide.", "面向全球学习者的个性化中文课程。"].includes(d.pageDescription) ? seoCopy[lang].description : d.pageDescription,
    path: "",
    image: d.slides[0]?.image,
    seo: d.seo,
    languageAlternates: languagePaths(locales.filter((_, index) => homes[index].seo?.noIndex !== true).map((locale) => ({ locale, path: `/${locale}` }))),
  });
}
export default async function LocalizedHome({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const d = await getHomepageData(lang);
  return (
    <>
      <SiteStructuredData locale={lang} global={d.global} />
      <Header settings={d.global} locale={lang} />
      <main>
        <HeroSection slides={d.slides} locale={lang} />
        <CourseList
          courses={d.courses}
          title={d.courseSectionTitle}
          locale={lang}
        />
        <KnowledgeCenter
          articles={d.articles}
          title={d.knowledgeSectionTitle}
          locale={lang}
        />
        <Testimonials
          testimonials={d.testimonials}
          title={d.testimonialSectionTitle}
          locale={lang}
        />
        <Newsletter
          title={d.newsletterTitle}
          description={d.newsletterDescription}
          locale={lang}
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
