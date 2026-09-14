"use client";

import Link from "next/link";
import { FormProvider } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { AuthFeedback } from "./auth-feedback";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
} from "./auth-styles";
import { usePasswordReset } from "./use-password-reset";

export function ForgotPasswordForm() {
  const form = usePasswordReset();

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
        <AuthFeedback error={form.error} notice={form.notice} />
        <GeneralButton
          className="w-full"
          type="submit"
          variant="brand"
          disabled={form.busy}
        >
          {form.busy ? "Please wait…" : "Send reset instructions"}
        </GeneralButton>
        <Link
          href="/sign-in"
          className={`block text-center text-sm ${authLinkClassName}`}
        >
          Return to sign in
        </Link>
      </form>
    </FormProvider>
  );
}
