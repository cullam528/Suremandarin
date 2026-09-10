import type { NextConfig } from "next";

const strapiUrl = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337";
// Vercel supplies VERCEL_ENV at build time. Self-hosted production keeps the
// existing indexable default unless the operator explicitly disables indexing.
const indexingAllowed = process.env.SEO_NOINDEX !== "true" &&
  (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

const nextConfig: NextConfig = {
  // Allow versioned local assets so updated public images bypass browser/CDN caches.
  images: {
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/course-detail/**" },
      { pathname: "/strapi-media/**" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ocfluvnjbidqtmescslf.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "api.suremandarin.com",
        port: "",
        pathname: "/uploads/**",
      },
    ],
  },
  // Keep Turbopack scoped to this app when the workspace contains other lockfiles.
  turbopack: {
    root: process.cwd(),
  },
  // Keep icon imports tree-shakeable in every client bundle.
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Avoid a build-time request burst against the small Strapi instance.
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 32,
  },
  async rewrites() {
    return [{ source: "/strapi-media/:path*", destination: `${strapiUrl}/uploads/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Permissions-Policy",
            value: "microphone=(self)",
          },
        ],
      },
      ...(!indexingAllowed
        ? [{
            source: "/:path*",
            headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
          }]
        : [
            "/api/:path*",
            "/:lang(en|zh)/account/:path*",
            "/:lang(en|zh)/:page(login|register|forgot-password|reset-password|checkout)",
            "/:lang(en|zh)/payment/:path*",
            "/:lang(en|zh)/inquiry/success",
            "/:page(account|login|register|forgot-password|reset-password)/:path*",
          ].map((source) => ({
            source,
            headers: [{ key: "X-Robots-Tag", value: "noindex" }],
          }))),
    ];
  },
};

export default nextConfig;
