import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" description="Use an email address you can verify. SME Fund never stores your password.">
      <AuthForm mode="register" />
    </AuthCard>
  );
}
