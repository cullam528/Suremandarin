import type { NextConfig } from "next";

const strapiUrl = process.env.STRAPI_URL ?? process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337";

const nextConfig: NextConfig = {
  // Allow versioned local assets so updated public images bypass browser/CDN caches.
  images: {
    localPatterns: [
      { pathname: "/images/**" },
      { pathname: "/course-detail/**" },
    ],
  },
  // Keep Turbopack scoped to this app when the workspace contains other lockfiles.
  turbopack: {
    root: process.cwd(),
  },
  // Keep icon imports tree-shakeable in every client bundle.
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
    ];
  },
};

export default nextConfig;
