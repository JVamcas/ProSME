import type { Metadata } from "next";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { RegistrationForm } from "@/modules/users/ui/auth/registration-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <AuthCard title="Create your account" description="">
      <RegistrationForm />
    </AuthCard>
  );
}
