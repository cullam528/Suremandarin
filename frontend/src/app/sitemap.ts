import type { MetadataRoute } from "next";
import {
  getHomepageData,
  getKnowledgeArticles,
  knowledgeCategories,
  type KnowledgeCategorySlug,
} from "@/lib/strapi";
import { absoluteUrl } from "@/lib/seo";

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
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    ...["en", "zh"].flatMap((locale) =>
      publicPages.map((path) => ({
        url: absoluteUrl(`/${locale}${path}`),
        changeFrequency: (path === "/knowledge" ? "daily" : "weekly") as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: path === "" ? 1 : path === "/courses" || path === "/knowledge" ? 0.9 : 0.7,
      } as MetadataRoute.Sitemap[number])),
    ),
  ];

  try {
    const [enHome, zhHome] = await Promise.all([
      getHomepageData("en"),
      getHomepageData("zh"),
    ]);
    for (const [locale, home] of [
      ["en", enHome],
      ["zh", zhHome],
    ] as const) {
      for (const course of home.courses) {
        entries.push({
          url: absoluteUrl(`/${locale}/courses/${course.slug}`),
          changeFrequency: "weekly",
          priority: 0.85,
        });
      }
    }

    for (const locale of ["en", "zh"] as const) {
      for (const category of Object.keys(knowledgeCategories) as KnowledgeCategorySlug[]) {
        const articles = await getKnowledgeArticles(category, locale);
        for (const article of articles) {
          if (!article.slug) continue;
          entries.push({
            url: absoluteUrl(`/${locale}/knowledge/${category}/${article.slug}`),
            lastModified: article.publishDate || undefined,
            changeFrequency: "monthly",
            priority: 0.75,
          });
        }
      }
    }
  } catch (error) {
    console.error("Sitemap content expansion failed; returning static URLs.", error);
  }

  return entries;
}
