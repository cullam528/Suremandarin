import type { MetadataRoute } from "next";
import { absoluteUrl, indexingAllowed } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  if (!indexingAllowed) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authentication/account pages must be crawlable for their noindex
        // metadata and X-Robots-Tag responses to be seen. APIs are not pages.
        disallow: ["/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
