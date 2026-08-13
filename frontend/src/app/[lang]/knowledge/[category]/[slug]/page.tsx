import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetail } from "@/components/knowledge/ArticleDetail";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getKnowledgeArticle, knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; category: string; slug: string }>;
}): Promise<Metadata> {
  const { lang, category, slug } = await params;
  if (!isLocale(lang) || !(category in knowledgeCategories)) return {};
  const article = await getKnowledgeArticle(
    slug,
    category as KnowledgeCategorySlug,
    lang,
  );
  return article
    ? pageMetadata({
        locale: lang,
        title: `${article.title} | SureMandarin`,
        description: article.excerpt,
        path: `/knowledge/${category}/${slug}`,
        image: article.image,
        imageAlt: article.imageAlt,
        article: {
          publishedTime: article.publishDate || undefined,
          modifiedTime: article.updatedAt || article.publishDate || undefined,
          authors: [article.authorName],
          section: article.categoryName,
        },
      })
    : pageMetadata({
        locale: lang,
        title: lang === "zh" ? "中文学习文章 | SureMandarin" : "Chinese Learning Article | SureMandarin",
        description: lang === "zh" ? "SureMandarin 中文学习文章。" : "A Chinese learning article from SureMandarin.",
        path: `/knowledge/${category}/${slug}`,
      });
}

export default async function KnowledgeArticlePage({
  params,
}: {
  params: Promise<{ lang: string; category: string; slug: string }>;
}) {
  const { lang, category, slug } = await params;
  if (!isLocale(lang) || !(category in knowledgeCategories)) notFound();
  const categorySlug = category as KnowledgeCategorySlug;
  const article = await getKnowledgeArticle(slug, categorySlug, lang);
  if (!article) notFound();
  const articleUrl = absoluteUrl(`/${lang}/knowledge/${category}/${slug}`);
  const articleImage = article.image.startsWith("http")
    ? article.image
    : absoluteUrl(article.image);
  return (
    <SiteShell locale={lang}>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${articleUrl}#article`,
            headline: article.title,
            description: article.excerpt,
            image: articleImage,
            datePublished: article.publishDate || undefined,
            dateModified: article.updatedAt || article.publishDate || undefined,
            author: { "@type": "Person", name: article.authorName },
            publisher: {
              "@type": "EducationalOrganization",
              name: "SureMandarin",
              url: absoluteUrl("/"),
              logo: {
                "@type": "ImageObject",
                url: absoluteUrl("/icon.png"),
                width: 256,
                height: 256,
              },
            },
            mainEntityOfPage: articleUrl,
            inLanguage: lang === "zh" ? "zh-CN" : "en",
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "知识中心" : "Knowledge Center", path: `/${lang}/knowledge` },
            { name: knowledgeCategories[categorySlug][lang].title, path: `/${lang}/knowledge/${category}` },
            { name: article.title, path: `/${lang}/knowledge/${category}/${slug}` },
          ]),
        ]}
      />
      <ArticleDetail article={article} category={categorySlug} locale={lang} />
    </SiteShell>
  );
}
