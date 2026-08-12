import type { Metadata } from "next";
import { ReferralPlan } from "@/components/site/ReferralPlan";
import { SiteShell } from "@/components/site/SiteShell";

export const metadata: Metadata = {
  title: "Referral Plan | SureMandarin",
  description: "Invite a friend to learn Chinese and unlock learning benefits for both of you.",
};

export default async function ReferralPage() {
  return (
    <SiteShell locale="en">
      <ReferralPlan locale="en" />
    </SiteShell>
  );
}
