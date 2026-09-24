import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { GeneralButton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Access denied",
};

export default function UnauthorizedPage() {
  return (
    <AuthCard
      eyebrow="Access denied"
      title="You cannot open this area"
      description="Your are not authorised to access this resource. Please contact your administrator if you believe this is an error."
    >
      <GeneralButton asChild className="w-full" variant="primary">
        <Link href="/portal">Return to the applicant portal</Link>
      </GeneralButton>
    </AuthCard>
  );
}
