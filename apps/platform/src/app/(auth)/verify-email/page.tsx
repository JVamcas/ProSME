import type { Metadata } from "next";

import { authReturnTo, type AuthNavigationQuery } from "@/platform/auth/AuthNavigation";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { EmailVerificationPanel } from "@/modules/users/ui/auth/email-verification-panel";

export const metadata: Metadata = {
  title: "Verify email",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<AuthNavigationQuery>;
}) {
  const returnTo = authReturnTo(await searchParams);
  return (
    <AuthCard
      title="Verify your email"
      description="Open the verification link sent to your inbox. If it has not arrived, request another one below."
    >
      <EmailVerificationPanel returnTo={returnTo} />
    </AuthCard>
  );
}
