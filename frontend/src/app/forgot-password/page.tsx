import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

export const metadata = { title: "Forgot Password | SureMandarin", robots: { index: false, follow: false } };
export default function Page() { return <PasswordRecoveryForm mode="forgot" />; }
