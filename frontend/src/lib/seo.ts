import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";
import type { GlobalData } from "@/lib/strapi";

/**
 * Keep the public URL configurable so preview deployments never get indexed
 * as the canonical production site. Set NEXT_PUBLIC_SITE_URL in Vercel.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.suremandarin.com";

export const siteName = "SureMandarin";

export const seoCopy = {
  en: {
    title: "SureMandarin | Chinese Courses for Confident Global Learners",
    description:
      "Learn Mandarin Chinese with expert teachers through private, group, online, IB, travel, and tailored courses for learners worldwide.",
    shortDescription:
      "Personalized Mandarin Chinese courses for learners worldwide.",
  },
  zh: {
    title: "SureMandarin | 面向全球学习者的中文培训课程",
    description:
      "SureMandarin 提供一对一、小组、在线、IB、游学和定制中文培训，帮助全球学习者自信、实用地学好中文。",
    shortDescription: "面向全球学习者的个性化中文培训课程。",
  },
} as const;

export function absoluteUrl(path = "") {
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
  noIndex = false,
}: {
  locale: Locale;
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}): Metadata {
  const languages = localizedUrls(path);
  const canonical = languages[locale];
  return {
    title,
    description,
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical,
      languages: {
        en: languages.en,
        zh: languages.zh,
        "x-default": languages.en,
      },
    },
    openGraph: {
      type: "website",
      siteName,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      url: canonical,
      title,
      description,
      images: [{ url: absoluteUrl(image), width: 1200, height: 675, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteUrl(image)],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, "max-image-preview": "large" },
  };
}

export function jsonLd(data: Record<string, unknown> | Record<string, unknown>[]) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function siteStructuredData({
  locale,
  global,
}: {
  locale: Locale;
  global?: Partial<GlobalData>;
}) {
  const socialLinks = (global?.socialLinks ?? [])
    .map((item) => item.url)
    .filter(Boolean);
  const localizedHome = absoluteUrl(`/${locale}`);
  return [
    {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      alternateName: "SureMandarin Chinese Training",
      url: siteUrl,
      logo: absoluteUrl("/images/suremandarin-logo.webp"),
      description: seoCopy[locale].description,
      sameAs: socialLinks,
      areaServed: "Worldwide",
      knowsAbout: [
        "Mandarin Chinese",
        "Chinese language education",
        "HSK preparation",
        "Chinese culture",
        "IB Chinese tutoring",
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: siteName,
      url: siteUrl,
      inLanguage: locale === "zh" ? "zh-CN" : "en",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${localizedHome}/knowledge?query={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ];
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
