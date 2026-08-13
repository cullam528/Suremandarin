import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  absoluteUrl,
  googleSiteVerification,
  seoCopy,
  siteName,
  siteUrl,
} from "@/lib/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: seoCopy.en.title,
  description: seoCopy.en.description,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "education",
  alternates: {
    canonical: absoluteUrl("/en"),
    languages: {
      en: absoluteUrl("/en"),
      "zh-Hans": absoluteUrl("/zh"),
      "x-default": absoluteUrl("/en"),
    },
  },
  openGraph: {
    type: "website",
    siteName,
    title: seoCopy.en.title,
    description: seoCopy.en.description,
    url: absoluteUrl("/en"),
    locale: "en_US",
    alternateLocale: ["zh_CN"],
    images: [
      {
        url: absoluteUrl("/images/hero-global-learners.webp"),
        width: 1200,
        height: 675,
        alt: "SureMandarin Chinese learning",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seoCopy.en.title,
    description: seoCopy.en.description,
    images: [absoluteUrl("/images/hero-global-learners.webp")],
  },
  robots: {
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
  verification: googleSiteVerification
    ? { google: googleSiteVerification }
    : undefined,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${jakarta.variable} font-sans antialiased`}>{children}</body></html>;
}
