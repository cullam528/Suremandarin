import type { Locale } from "@/lib/i18n";
import type { GlobalData } from "@/lib/strapi";
import { jsonLd, siteStructuredData } from "@/lib/seo";

export function StructuredData({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}

export function SiteStructuredData({
  locale,
  global,
}: {
  locale: Locale;
  global?: Partial<GlobalData>;
}) {
  return <StructuredData data={siteStructuredData({ locale, global })} />;
}

