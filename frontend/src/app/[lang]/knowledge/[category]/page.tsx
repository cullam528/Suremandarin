import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KnowledgeListing } from "@/components/knowledge/KnowledgeListing";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getKnowledgeArticles, knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateStaticParams() {
  return Object.keys(knowledgeCategories).flatMap((category) => [
    { lang: "en", category },
    { lang: "zh", category },
  ]);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; category: string }>;
}): Promise<Metadata> {
  const { lang, category } = await params;
  if (!isLocale(lang) || !(category in knowledgeCategories)) return {};
  const copy = knowledgeCategories[category as KnowledgeCategorySlug][lang];
  return pageMetadata({
    locale: lang,
    title: `${copy.title} | SureMandarin`,
    description: copy.description,
    path: `/knowledge/${category}`,
  });
}

export default async function KnowledgeCategoryPage({
  params,
}: {
  params: Promise<{ lang: string; category: string }>;
}) {
  const { lang, category } = await params;
  if (!isLocale(lang) || !(category in knowledgeCategories)) notFound();
  const categorySlug = category as KnowledgeCategorySlug;
  const articles = await getKnowledgeArticles(categorySlug, lang);
  return (
    <SiteShell locale={lang}>
      <StructuredData
        data={breadcrumbStructuredData([
          { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
          { name: lang === "zh" ? "知识中心" : "Knowledge Center", path: `/${lang}/knowledge` },
          { name: knowledgeCategories[categorySlug][lang].title, path: `/${lang}/knowledge/${category}` },
        ])}
      />
      <KnowledgeListing
        articles={articles}
        category={categorySlug}
        locale={lang}
      />
    </SiteShell>
  );
}
