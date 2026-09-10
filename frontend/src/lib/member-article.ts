import "server-only";
import { cache } from "react";
import { getAuthToken, STRAPI_URL } from "@/lib/auth";
import { getKnowledgeArticle, parseArticle, type ArticleDetailData, type KnowledgeCategorySlug } from "@/lib/strapi";
import type { Locale } from "@/lib/i18n";

// Public discovery remains anonymous and cacheable. Only an unavailable public
// article requires a request-specific member lookup. Never put its body in the
// public catalog, sitemap, shared fetch cache, or unauthenticated response.
export const getReadableKnowledgeArticle = cache(async (
  slug: string,
  category: KnowledgeCategorySlug,
  locale: Locale,
): Promise<ArticleDetailData | null> => {
  const publicArticle = await getKnowledgeArticle(slug, category, locale);
  if (publicArticle) return publicArticle;
  const token = await getAuthToken();
  if (!token) return null;
  const query = new URLSearchParams({
    locale,
    status: "published",
    "filters[slug][$eq]": slug,
    "filters[category][slug][$eq]": category,
    "populate[cover]": "true",
    "populate[category]": "true",
    "populate[seo][populate]": "shareImage",
    "pagination[pageSize]": "1",
  });
  const response = await fetch(`${STRAPI_URL}/api/articles?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if ([401, 403, 404].includes(response.status)) return null;
  if (!response.ok) throw new Error(`Member article request failed: ${response.status}`);
  const { data } = await response.json() as { data?: Array<Record<string, unknown>> };
  const raw = data?.[0];
  // Membership is checked by Strapi, never by a caller-supplied access level.
  // These checks also guard against an unexpected or stale backend response.
  if (!raw || raw.slug !== slug || !raw.publishedAt || raw.enabled !== true
    || (raw.category as { slug?: string } | null)?.slug !== category) return null;
  const article = parseArticle(raw, 0, category);
  return { ...article, seo: { ...article.seo, noIndex: true } };
});
