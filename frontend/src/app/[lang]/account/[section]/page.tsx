import { notFound, redirect } from "next/navigation";
import { AccountSection } from "@/components/site/AccountSection";
import { SiteShell } from "@/components/site/SiteShell";
import { getCurrentUser } from "@/lib/auth";
import { getAccountOverview } from "@/lib/account-data";
import { isLocale } from "@/lib/i18n";
const sections = [
  "profile",
  "subscriptions",
  "orders",
  "progress",
  "my-courses",
  "referrals",
] as const;
export async function generateStaticParams() {
  return ["en", "zh"].flatMap((lang) =>
    sections.map((section) => ({ lang, section })),
  );
}
export default async function AccountSectionRoute({
  params,
}: {
  params: Promise<{ lang: string; section: string }>;
}) {
  const { lang, section } = await params;
  if (
    !isLocale(lang) ||
    !sections.includes(section as (typeof sections)[number])
  )
    notFound();
  const [user, overview] = await Promise.all([
    getCurrentUser(),
    getAccountOverview(),
  ]);
  if (!user) redirect(`/${lang}/login`);
  return (
    <SiteShell locale={lang}>
      <AccountSection
        locale={lang}
        section={section as (typeof sections)[number]}
        user={user}
        overview={overview}
      />
    </SiteShell>
  );
}
