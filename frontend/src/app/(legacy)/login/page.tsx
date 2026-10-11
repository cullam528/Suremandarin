import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
export const metadata: Metadata = {
  title: "Sign In | SureMandarin",
  description: "Sign in to your SureMandarin learning account.",
  robots: { index: false, follow: false },
};
export default function LoginPage() {
  return <AuthForm mode="login" />;
}
