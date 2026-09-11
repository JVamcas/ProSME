import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Email verified" };

export default function VerifyEmailPage() {
  return (
    <AuthCard title="Check your verification" description="After Firebase confirms your email address, return here to continue.">
      <Button asChild className="w-full"><Link href="/sign-in">Continue to sign in</Link></Button>
    </AuthCard>
  );
}
