import type { Metadata } from "next";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { ForgotPasswordForm } from "@/modules/users/ui/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address associated with your SME Fund account."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
