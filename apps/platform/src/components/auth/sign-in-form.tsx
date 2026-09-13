"use client";

import Link from "next/link";
import { FormProvider } from "react-hook-form";

import { Button } from "@/components/ui/button";
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
  nextPath?: string;
};

export function SignInForm({ nextPath }: SignInFormProps) {
  const form = useSignIn(nextPath);

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
          showForgotPassword
        />
        <AuthFeedback error={form.error} />
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={form.busy}
        >
          {form.busy ? "Please wait…" : "Sign in"}
        </Button>
        <p className={authSupportingTextClassName}>
          Don&apos;t have an account?{" "}
          <Link
            className={authLinkClassName}
            href="/register"
          >
            Create an account
          </Link>
        </p>
      </form>
    </FormProvider>
  );
}
