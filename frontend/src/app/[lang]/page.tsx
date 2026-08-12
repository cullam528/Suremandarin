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
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { getHomepageData } from "@/lib/strapi";
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
  const d = await getHomepageData(lang);
  return pageMetadata({
    locale: lang,
    title: d.pageTitle,
    description: d.pageDescription,
    path: "",
    image: d.slides[0]?.image,
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
