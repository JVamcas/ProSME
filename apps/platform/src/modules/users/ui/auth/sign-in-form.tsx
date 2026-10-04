"use client";

import Link from "next/link";

import { authNavigationHref } from "@/platform/auth/AuthNavigation";
import { FormProvider } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { AuthFeedback } from "./auth-feedback";
import { AuthPasswordField } from "./auth-password-field";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
  authSupportingTextClassName,
} from "./auth-styles";
import { useSignIn } from "./use-sign-in";

type SignInFormProps = {
  returnTo?: string;
};

export function SignInForm({ returnTo }: SignInFormProps) {
  const form = useSignIn(returnTo);

  return (
    <FormProvider {...form.form}>
      <form
        onSubmit={form.form.handleSubmit(form.submit)}
        className="space-y-5"
        noValidate
      >
        <FormInput
          id="email"
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          className={authFieldClassName}
          labelClassName={authLabelClassName}
        />
        <AuthPasswordField
          autoComplete="current-password"
          returnTo={returnTo}
          showForgotPassword
        />
        <AuthFeedback error={form.error} />
        <GeneralButton
          type="submit"
          variant="primary"
          className="w-full"
          disabled={form.busy}
        >
          {form.busy ? "Please wait…" : "Sign in"}
        </GeneralButton>
        <p className={authSupportingTextClassName}>
          Don&apos;t have an account?{" "}
          <Link className={authLinkClassName} href={authNavigationHref("/register", returnTo)}>
            Create an account
          </Link>
        </p>
      </form>
    </FormProvider>
  );
}
