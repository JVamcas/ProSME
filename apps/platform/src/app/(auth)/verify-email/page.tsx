import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { EmailVerificationPanel } from "@/components/auth/email-verification-panel";

export const metadata: Metadata = {
  title: "Verify email",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email"
      description="Open the verification link sent by Firebase. If it has not arrived, request another one below."
    >
      <EmailVerificationPanel />
    </AuthCard>
  );
}
