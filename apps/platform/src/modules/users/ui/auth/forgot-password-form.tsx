"use client";

import Link from "next/link";

import { authNavigationHref } from "@/platform/auth/AuthNavigation";

import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { AuthForm } from "./AuthForm";
import { AuthFeedback } from "./auth-feedback";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
} from "./auth-styles";
import { usePasswordReset } from "./use-password-reset";

export function ForgotPasswordForm({ returnTo }: { returnTo?: string }) {
  const form = usePasswordReset();

  return (
    <AuthForm form={form.form} onSubmit={form.submit}>
      <FormInput
        id="email"
        name="email"
        label="Email address"
        type="email"
        autoComplete="email"
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <AuthFeedback error={form.error} notice={form.notice} />
      <GeneralButton
        className="w-full"
        type="submit"
        variant="primary"
        disabled={form.busy}
      >
        {form.busy ? "Please wait…" : "Send reset instructions"}
      </GeneralButton>
      <Link
        href={authNavigationHref("/sign-in", returnTo)}
        className={`block text-center text-sm ${authLinkClassName}`}
      >
        Return to sign in
      </Link>
    </AuthForm>
  );
}
