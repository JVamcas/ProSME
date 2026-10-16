import { getPublicPageVisibility } from "@/modules/content/application/ServerPublicPageVisibilityService";
import { isPublicPageVisible } from "@/modules/content/domain/PublicPageVisibility";
import type { Metadata } from "next";

import { authReturnTo, type AuthNavigationQuery } from "@/platform/auth/AuthNavigation";

import { AuthCard } from "@/modules/users/ui/auth/auth-card";
import { SignInForm } from "@/modules/users/ui/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<AuthNavigationQuery>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const [query, visibility] = await Promise.all([
    searchParams,
    getPublicPageVisibility(),
  ]);

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to access your account."
    >
      <SignInForm
        returnTo={authReturnTo(query)}
        allowRegistration={isPublicPageVisible(visibility, "account-creation")}
      />
    </AuthCard>
  );
}
