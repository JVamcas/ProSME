import type { Metadata } from "next";

import { authReturnTo, type AuthNavigationQuery } from "@/platform/auth/AuthNavigation";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { RegistrationForm } from "@/modules/users/ui/auth/registration-form";

export const metadata: Metadata = {
  title: "Create account",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<AuthNavigationQuery>;
}) {
  const returnTo = authReturnTo(await searchParams);
  return (
    <AuthCard title="Create your account" description="">
      <RegistrationForm returnTo={returnTo} />
    </AuthCard>
  );
}
