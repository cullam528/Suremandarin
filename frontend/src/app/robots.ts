import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/en/account",
          "/zh/account",
          "/en/login",
          "/zh/login",
          "/en/register",
          "/zh/register",
          "/en/forgot-password",
          "/zh/forgot-password",
          "/en/reset-password",
          "/zh/reset-password",
          "/en/checkout",
          "/zh/checkout",
          "/en/payment/",
          "/zh/payment/",
          "/en/inquiry/success",
          "/zh/inquiry/success",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
