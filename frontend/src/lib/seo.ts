import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import type { GlobalData } from "@/lib/strapi";
import type { ContentSeo } from "@/lib/content-seo";
import { contentText } from "@/lib/content-seo";

/**
 * Keep the public URL configurable so preview deployments never get indexed
 * as the canonical production site. Set NEXT_PUBLIC_SITE_URL in Vercel.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.suremandarin.com";

export const siteName = "SureMandarin";
export const indexingAllowed = process.env.SEO_NOINDEX !== "true" && (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");
export const bingSiteVerification = process.env.BING_SITE_VERIFICATION?.trim() || process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() || undefined;

export const googleSiteVerification =
  process.env.GOOGLE_SITE_VERIFICATION?.trim() ||
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
  undefined;

export const seoCopy = {
  en: {
    title: "Learn Mandarin Online & in China | SureMandarin",
    description:
      "Learn Mandarin with a real teacher. Compare private, group, online, IB Chinese and immersion courses, take a free level test and plan your lessons.",
    shortDescription:
      "Personalized Mandarin Chinese courses for learners worldwide.",
  },
  zh: {
    title: "SureMandarin 中文培训｜在线中文、一对一及 IB 中文辅导",
    description:
      "SureMandarin 提供一对一、小组、在线、IB、游学和定制中文培训，帮助全球学习者自信、实用地学好中文。",
    shortDescription: "面向全球学习者的个性化中文培训课程。",
  },
} as const;

export function absoluteUrl(path = "") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${siteUrl}${path.startsWith("/") || !path ? path : `/${path}`}`;
}

export function localizedUrls(path: string) {
  return {
    en: absoluteUrl(`/en${path}`),
    zh: absoluteUrl(`/zh${path}`),
  };
}

export function pageMetadata({
  locale,
  title,
  description,
  path,
  image = "/images/hero-global-learners.webp",
  imageAlt,
  noIndex = false,
  article,
  seo,
  languageAlternates,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
  seo?: ContentSeo;
  /** Actual published translations for CMS documents; omitted for static bilingual pages. */
  languageAlternates?: Record<string, string>;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
  };
}): Metadata {
  const languages = localizedUrls(path);
  const canonical = languages[locale];
  title = contentText(seo?.metaTitle || title);
  description = contentText(seo?.metaDescription || description);
  noIndex = noIndex || seo?.noIndex === true || !indexingAllowed;
  const socialImage = absoluteUrl(seo?.shareImage || image);
  const openGraphImage = {
    url: socialImage,
    alt: imageAlt || title,
  };
  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical,
      languages: languageAlternates ? Object.fromEntries(Object.entries(languageAlternates).map(([key, value]) => [key, absoluteUrl(value)])) : {
        en: languages.en,
        "zh-Hans": languages.zh,
        "x-default": languages.en,
      },
    },
    openGraph: article
      ? {
          type: "article",
          siteName,
          locale: locale === "zh" ? "zh_CN" : "en_US",
          alternateLocale: [locale === "zh" ? "en_US" : "zh_CN"],
          url: canonical,
          title,
          description,
          images: [openGraphImage],
          publishedTime: article.publishedTime,
          modifiedTime: article.modifiedTime,
          authors: article.authors,
          section: article.section,
        }
      : {
          type: "website",
          siteName,
          locale: locale === "zh" ? "zh_CN" : "en_US",
          alternateLocale: [locale === "zh" ? "en_US" : "zh_CN"],
          url: canonical,
          title,
          description,
          images: [openGraphImage],
        },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
    robots: noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}

export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function siteStructuredData({
  global,
  locale,
}: {
  locale: Locale;
  global?: Partial<GlobalData>;
}) {
  const socialLinks = [...new Set([...(global?.socialLinks ?? [])
    .map((item) => item.url)
    .filter((url) => /^https?:\/\//i.test(url)),
    "https://www.youtube.com/@Suremandarin",
    "https://x.com/JessSuremanda",
    "https://xhslink.cn/m/5k2RxYiaMts",
  ])];
  return {
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      alternateName: "SureMandarin Chinese Training",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.png"),
        width: 256,
        height: 256,
      },
      image: absoluteUrl("/images/hero-global-learners.webp"),
      description: seoCopy[locale].description,
      ...(socialLinks.length ? { sameAs: socialLinks } : {}),
      areaServed: "Worldwide",
      knowsAbout: [
        "Mandarin Chinese",
        "Chinese language education",
        "HSK preparation",
        "Chinese culture",
        "IB Chinese tutoring",
      ],
    }, {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      url: siteUrl,
      inLanguage: ["en", "zh-CN"],
      publisher: { "@id": `${siteUrl}/#organization` },
    }],
  };
}

export function breadcrumbStructuredData(
  items: Array<{ name: string; path: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
