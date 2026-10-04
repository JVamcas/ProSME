import type { Metadata } from "next";

import { authReturnTo, type AuthNavigationQuery } from "@/platform/auth/AuthNavigation";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { ForgotPasswordForm } from "@/modules/users/ui/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<AuthNavigationQuery>;
}) {
  const returnTo = authReturnTo(await searchParams);
  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email address associated with your SME Fund account."
    >
      <ForgotPasswordForm returnTo={returnTo} />
    </AuthCard>
  );
}
