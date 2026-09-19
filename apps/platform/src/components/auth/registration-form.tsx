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
  authSupportingTextClassName,
} from "./auth-styles";
import { useRegistration } from "./use-registration";


export function RegistrationForm() {
  const form = useRegistration();

  return (
    <FormProvider {...form.form}>
      <form
        onSubmit={form.form.handleSubmit(form.submit)}
        className="space-y-5"
        noValidate
      >
        <FormInput
          id="first-name"
          label="First name"
          autoComplete="given-name"
          name="firstName"
          className={authFieldClassName}
          labelClassName={authLabelClassName}
        />
        <FormInput
          id="surname"
          label="Surname"
          autoComplete="family-name"
          name="surname"
          className={authFieldClassName}
          labelClassName={authLabelClassName}
        />
        <FormInput
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          name="email"
          className={authFieldClassName}
          labelClassName={authLabelClassName}
        />
        <FormInput
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          name="password"
          className={authFieldClassName}
          labelClassName={authLabelClassName}
        />
        <FormInput
          id="confirm-password"
          label="Confirm password"
          type="password"
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
          <Link className={authLinkClassName} href="/sign-in">
            Sign in
          </Link>
        </p>
      </form>
    </FormProvider>
  );
}
