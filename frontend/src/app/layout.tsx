import type { Metadata } from "next";
import Image from "next/image";
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

// This detector is intentionally a native ES5 script. IE cannot execute the
// modern Next.js runtime that normally schedules next/script components.
const legacyInternetExplorerDetector = `(function () {
  var userAgent = window.navigator.userAgent || "";
  var isInternetExplorer = userAgent.indexOf("MSIE ") > -1 || userAgent.indexOf("Trident/") > -1;
  if (!isInternetExplorer) return;

  var root = document.documentElement;
  root.className += (root.className ? " " : "") + "legacy-ie";

  var style = document.createElement("style");
  style.type = "text/css";
  var css = "html.legacy-ie #legacy-browser-warning{top:0;right:0;bottom:0;left:0;display:block!important}html.legacy-ie .legacy-browser-card{margin:0 auto}";
  if (style.styleSheet) style.styleSheet.cssText = css;
  else style.appendChild(document.createTextNode(css));
  (document.getElementsByTagName("head")[0] || root).appendChild(style);
})();`;

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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          id="legacy-ie-detection"
          dangerouslySetInnerHTML={{ __html: legacyInternetExplorerDetector }}
        />
      </head>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        <aside id="legacy-browser-warning" aria-labelledby="legacy-browser-title">
          <section className="legacy-browser-card">
            <Image
              src="/icon.png"
              alt="SureMandarin"
              width={88}
              height={88}
              priority
              unoptimized
            />
            <p className="legacy-browser-brand">SureMandarin</p>
            <h1 id="legacy-browser-title">您的浏览器版本过旧</h1>
            <p>
              Internet Explorer 无法正常显示本网站。请使用 Microsoft Edge、
              Google Chrome、Safari 或 Firefox 打开。
            </p>
            <hr />
            <h2>Your browser is no longer supported</h2>
            <p>
              Internet Explorer cannot display this website correctly. Please
              open SureMandarin in a modern browser.
            </p>
            <nav aria-label="Recommended browsers">
              <a href="https://www.microsoft.com/edge/download" target="_blank" rel="noreferrer">
                Download Microsoft Edge
              </a>
              <a href="https://www.google.com/chrome/" target="_blank" rel="noreferrer">
                Download Google Chrome
              </a>
            </nav>
          </section>
        </aside>
        {children}
      </body>
    </html>
  );
}
