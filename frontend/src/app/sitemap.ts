import type { MetadataRoute } from "next";
import { getHomepageSettings, getCourseCatalogData, getKnowledgeArticles, isIndexableArticle, knowledgeCategories, type KnowledgeCategorySlug } from "@/lib/strapi";
import { absoluteUrl, indexingAllowed } from "@/lib/seo";
import { languagePaths, validContentDate } from "@/lib/content-seo";
import { publicPages } from "@/lib/site-pages";
import { locales, type Locale } from "@/lib/i18n";

export const revalidate = 3600;

function alternates(paths: Array<{ locale: Locale; path: string }>) {
  return { languages: Object.fromEntries(Object.entries(languagePaths(paths)).map(([lang, path]) => [lang, absoluteUrl(path)])) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingAllowed) return [];
  const categories = Object.keys(knowledgeCategories) as KnowledgeCategorySlug[];
  // Fail revalidation on a CMS outage so Next keeps the last good sitemap.
  // Publishing a truncated fallback would silently remove valid URLs.
  const [homes, courseGroups, articleGroups] = await Promise.all([
    Promise.all(locales.map((locale) => getHomepageSettings(locale))),
    Promise.all(locales.map((locale) => getCourseCatalogData(locale))),
    Promise.all(categories.map(async (category) => ({ category, articles: await Promise.all(locales.map((locale) => getKnowledgeArticles(category, locale))) }))),
  ]);
  const entries: MetadataRoute.Sitemap = [];
  for (const path of [...publicPages.map((page) => page.path), ...categories.map((category) => `/knowledge/${category}`)]) {
    const availableLocales = locales.filter((_, index) => path !== "" || homes[index].seo?.noIndex !== true);
    const translations = alternates(availableLocales.map((locale) => ({ locale, path: `/${locale}${path}` })));
    for (const locale of availableLocales) entries.push({ url: absoluteUrl(`/${locale}${path}`), alternates: translations });
  }
  for (const [index, locale] of locales.entries()) {
    const otherIndex = index === 0 ? 1 : 0;
    for (const course of courseGroups[index].filter((item) => item.slug && item.seo?.noIndex !== true)) {
      const other = courseGroups[otherIndex].find((item) => item.id === course.id) ?? courseGroups[otherIndex].find((item) => item.slug === course.slug);
      const paths = [{ locale, path: `/${locale}/courses/${course.slug}` }];
      if (other && other.seo?.noIndex !== true) paths.push({ locale: locales[otherIndex], path: `/${locales[otherIndex]}/courses/${other.slug}` });
      entries.push({ url: absoluteUrl(`/${locale}/courses/${course.slug}`), lastModified: validContentDate(course.updatedAt), alternates: alternates(paths) });
    }
    for (const { category, articles } of articleGroups) {
      for (const article of articles[index].filter(isIndexableArticle)) {
        const other = articles[otherIndex].find((item) => item.id === article.id) ?? articles[otherIndex].find((item) => item.slug === article.slug);
        const paths = [{ locale, path: `/${locale}/knowledge/${category}/${article.slug}` }];
        if (other && isIndexableArticle(other)) paths.push({ locale: locales[otherIndex], path: `/${locales[otherIndex]}/knowledge/${category}/${other.slug}` });
        entries.push({ url: absoluteUrl(`/${locale}/knowledge/${category}/${article.slug}`), lastModified: validContentDate(article.updatedAt || article.publishDate), alternates: alternates(paths), images: [absoluteUrl(article.image)] });
      }
    }
  }
  return Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());
}
