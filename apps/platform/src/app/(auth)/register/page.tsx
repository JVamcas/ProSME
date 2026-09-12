import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description=""
    >
      <RegistrationForm />
    </AuthCard>
  );
}
