import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SureMandarin Daily — 7-Day Chinese Speaking Challenge",
    short_name: "SureMandarin Daily",
    description: "A five-minute Mandarin speaking challenge for seven days.",
    start_url: "/en/daily",
    scope: "/",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#1565ff",
    orientation: "portrait-primary",
    icons: [
      { src: "/images/suremandarin-icon.webp", sizes: "192x192", type: "image/webp", purpose: "maskable" },
      { src: "/images/suremandarin-icon.webp", sizes: "512x512", type: "image/webp", purpose: "maskable" },
    ],
  };
}
