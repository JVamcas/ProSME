import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Access denied" };

export default function UnauthorizedPage() {
  return (
    <AuthCard eyebrow="Access denied" title="You cannot open this area" description="Your account does not have the required platform capability.">
      <Button asChild className="w-full"><Link href="/portal">Return to the applicant portal</Link></Button>
    </AuthCard>
  );
}
