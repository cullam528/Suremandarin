import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { publicPages } from "@/lib/site-pages";
import { getHomepageData, getKnowledgeArticles, isIndexableArticle, knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({ locale: lang, title: lang === "zh" ? "网站地图 | SureMandarin" : "Site Map | SureMandarin", description: lang === "zh" ? "查找 SureMandarin 中文课程、学习指南、免费水平测试和咨询服务。" : "Find SureMandarin Chinese courses, learning guides, free level assessments and consultation services.", path: "/site-map" }) : {};
}

export default async function SiteMapPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const categories = Object.keys(knowledgeCategories) as KnowledgeCategorySlug[];
  const [home, groups] = await Promise.all([getHomepageData(lang), Promise.all(categories.map(async (category) => ({ category, articles: (await getKnowledgeArticles(category, lang)).filter(isIndexableArticle) })))]);
  return <SiteShell locale={lang}>
    <section className="page-shell py-16 sm:py-24">
      <h1 className="text-4xl font-extrabold text-brand-navy">{lang === "zh" ? "网站地图" : "Site map"}</h1>
      <p className="mt-4 text-slate-600">{lang === "zh" ? "从这里查找课程、学习内容与咨询服务。" : "Find a course, continue learning or get in touch."}</p>
      <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
        <section><h2 className="text-xl font-bold text-brand-navy">{lang === "zh" ? "网站页面" : "Explore SureMandarin"}</h2><ul className="mt-4 space-y-3">{publicPages.filter((page) => page.path !== "/site-map").map((page) => <li key={page.path}><Link className="text-brand-blue hover:underline" href={`/${lang}${page.path}`}>{page[lang]}</Link></li>)}</ul></section>
        <section><h2 className="text-xl font-bold text-brand-navy">{lang === "zh" ? "中文课程" : "Chinese courses"}</h2><ul className="mt-4 space-y-3">{home.courses.map((course) => <li key={course.slug}><Link className="text-brand-blue hover:underline" href={`/${lang}/courses/${course.slug}`}>{course.title}</Link></li>)}</ul></section>
        {groups.map(({ category, articles }) => <section key={category}><h2 className="text-xl font-bold text-brand-navy"><Link href={`/${lang}/knowledge/${category}`}>{knowledgeCategories[category][lang].title}</Link></h2><ul className="mt-4 space-y-3">{articles.map((article) => <li key={article.slug}><Link className="text-brand-blue hover:underline" href={`/${lang}/knowledge/${category}/${article.slug}`}>{article.title}</Link></li>)}</ul></section>)}
      </div>
    </section>
  </SiteShell>;
}
