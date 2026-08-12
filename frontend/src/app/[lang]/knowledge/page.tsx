import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KnowledgeOverview } from "@/components/knowledge/KnowledgeOverview";
import { SiteShell } from "@/components/site/SiteShell";
import { AppShowcase } from "@/components/site/AppShowcase";
import { isLocale } from "@/lib/i18n";
import {
  getHomepageData,
  getKnowledgeArticles,
  knowledgeCategories,
  type KnowledgeCategorySlug,
} from "@/lib/strapi";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return isLocale(lang) ? pageMetadata({
    locale: lang,
    title: lang === "zh" ? "中文学习知识中心 | SureMandarin" : "Chinese Learning Knowledge Center | SureMandarin",
    description: lang === "zh" ? "阅读中文学习方法、学习技巧、中国文化和中文教育新闻，获得可执行的学习建议。" : "Read practical Chinese learning strategies, study tips, Chinese culture, and education insights from SureMandarin.",
    path: "/knowledge",
  }) : {};
}
export default async function KnowledgeIndex({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [home, ...articleGroups] = await Promise.all([
    getHomepageData(lang),
    ...Object.keys(knowledgeCategories).map((category) =>
      getKnowledgeArticles(category as KnowledgeCategorySlug, lang),
    ),
  ]);
  return (
    <SiteShell locale={lang}>
      <KnowledgeOverview
        sections={Object.keys(knowledgeCategories).map((category, index) => ({
          category: category as KnowledgeCategorySlug,
          articles: articleGroups[index],
        }))}
        title={
          lang === "zh"
            ? "中文学习知识中心"
            : "Your Chinese learning knowledge center"
        }
        locale={lang}
      />
      <AppShowcase locale={lang} settings={home.global} />
    </SiteShell>
  );
}
