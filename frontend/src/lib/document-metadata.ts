import type { Metadata } from "next";
import {
  absoluteUrl,
  bingSiteVerification,
  googleSiteVerification,
  indexingAllowed,
  seoCopy,
  siteName,
  siteUrl,
} from "@/lib/seo";

// Shared document defaults, independent of a request or route locale. Public
// pages supply their own localized canonical, alternates and social metadata.
export const documentMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seoCopy.en.title,
  description: seoCopy.en.description,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "education",
  openGraph: {
    type: "website",
    siteName,
    title: seoCopy.en.title,
    description: seoCopy.en.description,
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    images: [{
      url: absoluteUrl("/images/hero-global-learners.webp"),
      alt: "SureMandarin Chinese learning",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: seoCopy.en.title,
    description: seoCopy.en.description,
    images: [absoluteUrl("/images/hero-global-learners.webp")],
  },
  robots: {
    index: indexingAllowed,
    follow: indexingAllowed,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
    googleBot: {
      index: indexingAllowed,
      follow: indexingAllowed,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    ...(googleSiteVerification ? { google: googleSiteVerification } : {}),
    ...(bingSiteVerification ? { other: { "msvalidate.01": bingSiteVerification } } : {}),
  },
};

// Clear inherited home/article metadata when a missing resource throws
// notFound(). Keep verification and branding, but never canonicalize a 404 home.
export const notFoundMetadata: Metadata = {
  title: { absolute: "Page not found | SureMandarin" },
  description: "This page may have moved or no longer exists. Find Chinese courses and learning resources at SureMandarin.",
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  alternates: null,
  openGraph: null,
  twitter: null,
};
