import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/portal";
}

type SignInPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function SignInPage({
  searchParams,
}: SignInPageProps) {
  const query = await searchParams;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your account."
    >
      <SignInForm nextPath={safeNextPath(query.next)} />
    </AuthCard>
  );
}
