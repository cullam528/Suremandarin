import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
export const metadata: Metadata = {
  title: "Create Account | SureMandarin",
  description: "Create your SureMandarin learning account.",
  robots: { index: false, follow: false },
};
export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
