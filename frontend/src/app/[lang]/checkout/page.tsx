import { notFound } from "next/navigation";
import { CheckoutPage } from "@/components/site/CheckoutPage";
import { SiteShell } from "@/components/site/SiteShell";
import { isLocale } from "@/lib/i18n";
export default async function CheckoutRoute({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { lang } = await params;
  const query = await searchParams;
  if (!isLocale(lang)) notFound();
  return (
    <SiteShell locale={lang}>
      <CheckoutPage
        locale={lang}
        plan={query.plan === "svip" ? "svip" : "vip"}
      />
    </SiteShell>
  );
}
