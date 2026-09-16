import { notFound, permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";

export default async function LegacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  permanentRedirect(`/${lang}/knowledge`);
}
