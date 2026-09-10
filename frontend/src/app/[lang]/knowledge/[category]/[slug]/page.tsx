import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleDetail } from "@/components/knowledge/ArticleDetail";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
import { absoluteUrl, breadcrumbStructuredData, pageMetadata } from "@/lib/seo";
import { getKnowledgeArticles, getArticleLanguagePaths, isIndexableArticle, knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";
import { getReadableKnowledgeArticle as getKnowledgeArticle } from "@/lib/member-article";
import { languagePaths, searchDescription, validContentDate } from "@/lib/content-seo";
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
  if (!article) notFound();
  return pageMetadata({
        locale: lang,
        title: `${article.title} | SureMandarin`,
        description: searchDescription(article.excerpt, article.body),
        path: `/knowledge/${category}/${slug}`,
        image: article.image,
        imageAlt: article.imageAlt,
        seo: article.seo,
        noIndex: !isIndexableArticle(article),
        languageAlternates: languagePaths(await getArticleLanguagePaths(article, category as KnowledgeCategorySlug, lang)),
        article: {
          publishedTime: validContentDate(article.publishDate),
          modifiedTime: validContentDate(article.updatedAt || article.publishDate),
          authors: [article.authorName],
          section: article.categoryName,
        },
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
  const [relatedArticles, translations] = await Promise.all([
    getKnowledgeArticles(categorySlug, lang).then((items) => items.filter((item) => item.slug !== slug && isIndexableArticle(item)).slice(0, 3)),
    getArticleLanguagePaths(article, categorySlug, lang),
  ]);
  const articleUrl = absoluteUrl(`/${lang}/knowledge/${category}/${slug}`);
  const articleImage = article.image.startsWith("http")
    ? article.image
    : absoluteUrl(article.image);
  return (
    <SiteShell locale={lang} languageUrls={{ en: `/en/knowledge/${category}`, zh: `/zh/knowledge/${category}`, ...Object.fromEntries(translations.map((item) => [item.locale, item.path])) }}>
      <StructuredData
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "@id": `${articleUrl}#article`,
            headline: article.title,
            description: article.excerpt,
            image: articleImage,
            datePublished: validContentDate(article.publishDate),
            dateModified: validContentDate(article.updatedAt || article.publishDate),
            author: /SureMandarin|团队|编辑部/i.test(article.authorName)
              ? { "@type": "Organization", name: article.authorName, url: absoluteUrl(`/${lang}/about`) }
              : { "@type": "Person", name: article.authorName },
            publisher: {
              "@type": "EducationalOrganization",
              "@id": absoluteUrl("/#organization"),
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
            articleSection: knowledgeCategories[categorySlug][lang].title,
            isPartOf: { "@id": absoluteUrl("/#website") },
          },
          breadcrumbStructuredData([
            { name: lang === "zh" ? "首页" : "Home", path: `/${lang}` },
            { name: lang === "zh" ? "知识中心" : "Knowledge Center", path: `/${lang}/knowledge` },
            { name: knowledgeCategories[categorySlug][lang].title, path: `/${lang}/knowledge/${category}` },
            { name: article.title, path: `/${lang}/knowledge/${category}/${slug}` },
          ]),
        ]}
      />
      <ArticleDetail article={article} category={categorySlug} locale={lang} relatedArticles={relatedArticles} translations={translations} />
    </SiteShell>
  );
}
