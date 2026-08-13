import type { MetadataRoute } from "next";
import {
  getHomepageData,
  getKnowledgeArticles,
  knowledgeCategories,
  type KnowledgeCategorySlug,
} from "@/lib/strapi";
import { absoluteUrl } from "@/lib/seo";

type PublicLocale = "en" | "zh";

const locales: PublicLocale[] = ["en", "zh"];

const publicPages = [
  "",
  "/courses",
  "/knowledge",
  "/about",
  "/teachers",
  "/contact",
  "/faq",
  "/pricing",
  "/resources",
  "/app",
  "/referral",
  "/theysay",
  "/announcements",
  "/level-test",
  "/privacy",
  "/terms",
  "/cookies",
  "/daily",
];

function languageAlternates(path: string) {
  return {
    en: absoluteUrl(`/en${path}`),
    "zh-Hans": absoluteUrl(`/zh${path}`),
    "x-default": absoluteUrl(`/en${path}`),
  };
}

function localizedEntries(
  path: string,
  options: Pick<
    MetadataRoute.Sitemap[number],
    "changeFrequency" | "priority"
  >,
): MetadataRoute.Sitemap {
  return locales.map((locale) => ({
    url: absoluteUrl(`/${locale}${path}`),
    alternates: { languages: languageAlternates(path) },
    ...options,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = publicPages.flatMap((path) =>
    localizedEntries(path, {
      changeFrequency: path === "/knowledge" ? "daily" : "weekly",
      priority:
        path === ""
          ? 1
          : path === "/courses" || path === "/knowledge"
            ? 0.9
            : 0.7,
    }),
  );

  for (const category of Object.keys(
    knowledgeCategories,
  ) as KnowledgeCategorySlug[]) {
    entries.push(
      ...localizedEntries(`/knowledge/${category}`, {
        changeFrequency: "daily",
        priority: 0.8,
      }),
    );
  }

  try {
    const [enHome, zhHome] = await Promise.all([
      getHomepageData("en"),
      getHomepageData("zh"),
    ]);
    const courseSlugs = new Set([
      ...enHome.courses.map((course) => course.slug),
      ...zhHome.courses.map((course) => course.slug),
    ]);
    for (const slug of courseSlugs) {
      entries.push(
        ...localizedEntries(`/courses/${slug}`, {
          changeFrequency: "weekly",
          priority: 0.85,
        }),
      );
    }

    for (const category of Object.keys(
      knowledgeCategories,
    ) as KnowledgeCategorySlug[]) {
      const [englishArticles, chineseArticles] = await Promise.all([
        getKnowledgeArticles(category, "en"),
        getKnowledgeArticles(category, "zh"),
      ]);
      const articlesByLocale = {
        en: new Map(englishArticles.map((article) => [article.slug, article])),
        zh: new Map(chineseArticles.map((article) => [article.slug, article])),
      };
      const slugs = new Set([
        ...articlesByLocale.en.keys(),
        ...articlesByLocale.zh.keys(),
      ]);

      for (const slug of slugs) {
        if (!slug) continue;
        const availableLanguages: Record<string, string> = {};
        if (articlesByLocale.en.has(slug)) {
          availableLanguages.en = absoluteUrl(
            `/en/knowledge/${category}/${slug}`,
          );
          availableLanguages["x-default"] = availableLanguages.en;
        }
        if (articlesByLocale.zh.has(slug)) {
          availableLanguages["zh-Hans"] = absoluteUrl(
            `/zh/knowledge/${category}/${slug}`,
          );
        }

        for (const locale of locales) {
          const article = articlesByLocale[locale].get(slug);
          if (!article) continue;
          entries.push({
            url: absoluteUrl(`/${locale}/knowledge/${category}/${slug}`),
            lastModified: article.updatedAt || article.publishDate || undefined,
            alternates: { languages: availableLanguages },
            changeFrequency: "monthly",
            priority: 0.75,
          });
        }
      }
    }
  } catch (error) {
    console.error(
      "Sitemap content expansion failed; returning static URLs.",
      error,
    );
  }

  return entries;
}
