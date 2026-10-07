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
  authSupportingTextClassName,
} from "./auth-styles";
import { useRegistration } from "./use-registration";

export function RegistrationForm({ returnTo }: { returnTo?: string }) {
  const form = useRegistration(returnTo);

  return (
    <AuthForm form={form.form} onSubmit={form.submit}>
      <FormInput
        id="first-name"
        label="First name"
        autoComplete="given-name"
        name="firstName"
        required
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <FormInput
        id="surname"
        label="Surname"
        autoComplete="family-name"
        name="surname"
        required
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <FormInput
        id="email"
        label="Email address"
        type="email"
        autoComplete="email"
        name="email"
        required
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <FormInput
        id="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        name="password"
        required
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <FormInput
        id="confirm-password"
        label="Confirm password"
        type="password"
        required
        autoComplete="new-password"
        name="confirmPassword"
        className={authFieldClassName}
        labelClassName={authLabelClassName}
      />
      <AuthFeedback error={form.error} />
      <GeneralButton
        type="submit"
        variant="primary"
        className="w-full"
        disabled={form.busy}
      >
        {form.busy ? "Please wait…" : "Create account"}
      </GeneralButton>
      <p className={authSupportingTextClassName}>
        Already registered?{" "}
        <Link
          className={authLinkClassName}
          href={authNavigationHref("/sign-in", returnTo)}
        >
          Sign in
        </Link>
      </p>
    </AuthForm>
  );
}
