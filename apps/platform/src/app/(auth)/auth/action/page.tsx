import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { EmailActionPanel } from "@/modules/users/ui/auth/email-action-panel";

export const metadata: Metadata = {
  title: "Complete your account action",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function AuthActionPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Checking your link" description="Please wait…">
          Loading…
        </AuthCard>
      }
    >
      <EmailActionPanel />
    </Suspense>
  );
}
