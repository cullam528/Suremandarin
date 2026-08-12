import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { StatusPage } from "@/components/site/StatusPage";
import { isLocale } from "@/lib/i18n";
export default async function PaymentSuccess({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <StatusPage locale={lang} status="success" />
    </SiteShell>
  );
}
