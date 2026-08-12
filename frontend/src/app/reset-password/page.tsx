import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

export const metadata = { title: "Reset Password | SureMandarin", robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code = "" } = await searchParams;
  return <PasswordRecoveryForm mode="reset" resetCode={code} />;
}
