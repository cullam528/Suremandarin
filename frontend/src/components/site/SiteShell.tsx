import { ContactWidget } from "@/components/ContactWidget";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SiteStructuredData } from "@/components/seo/StructuredData";
import type { Locale } from "@/lib/i18n";
import { getGlobalData } from "@/lib/strapi";

export async function SiteShell({
  children,
  locale,
  languageUrls,
}: {
  children: React.ReactNode;
  locale: Locale;
  languageUrls?: Partial<Record<Locale, string>>;
}) {
  const global = await getGlobalData(locale);
  return (
    <>
      <SiteStructuredData locale={locale} global={global} />
      <Header settings={global} locale={locale} languageUrls={languageUrls} />
      <main>{children}</main>
      <ContactWidget
        settings={{
          ...global,
          contactTitle: locale === "zh" ? "联系我们" : global.contactTitle,
        }}
      />
      <Footer settings={global} locale={locale} languageUrls={languageUrls} />
    </>
  );
}
