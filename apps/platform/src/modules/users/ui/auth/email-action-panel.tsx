"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { getFirebaseErrorMessage } from "@/platform/auth/firebase/errors";
import { AuthCard } from "./auth-card";
import { AuthForm } from "./AuthForm";
import { AuthFeedback } from "./auth-feedback";
import { AuthPasswordField } from "./auth-password-field";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
} from "./auth-styles";
import { useEmailAction } from "./use-email-action";

export function EmailActionPanel() {
  const parameters = useSearchParams();
  const mode = parameters.get("mode");
  const code = parameters.get("oobCode");
  const { form, reset, resetCode, verification } = useEmailAction(mode, code);
  const verificationMode = mode === "verifyEmail";
  const recoveryPath = verificationMode ? "/verify-email" : "/forgot-password";
  const supported =
    Boolean(code) && (verificationMode || mode === "resetPassword");
  const error = verificationMode ? verification.error : resetCode.error;
  const success = verificationMode ? verification.isSuccess : reset.isSuccess;
  const loading = verificationMode
    ? verification.isIdle || verification.isPending
    : resetCode.isPending;

  if (!supported || error) {
    return (
      <AuthCard
        title="This link needs attention"
        description="Request another email to complete your account action."
      >
        <AuthFeedback
          error={
            error
              ? getFirebaseErrorMessage(error)
              : "This link is incomplete or unsupported."
          }
        />
        <Link className={`mt-5 block ${authLinkClassName}`} href={recoveryPath}>
          Request another email
        </Link>
      </AuthCard>
    );
  }
  if (success) {
    return (
      <AuthCard
        title={verificationMode ? "Email verified" : "Password updated"}
        description="You can now sign in to your account."
      >
        <AuthFeedback
          notice={
            verificationMode
              ? "Your email address has been confirmed."
              : "Your password has been changed."
          }
        />
        <Link className={`mt-5 block ${authLinkClassName}`} href="/sign-in">
          Continue to sign in
        </Link>
      </AuthCard>
    );
  }
  if (loading) {
    return (
      <AuthCard
        title="Checking your link"
        description="Please wait while we check your secure link."
      >
        <AuthFeedback notice="Checking your account action…" />
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Reset your password"
      description="Choose and confirm your new password."
    >
      <AuthForm form={form} onSubmit={(values) => reset.mutate(values)}>
        <AuthPasswordField autoComplete="new-password" />
        <FormInput
          autoComplete="new-password"
          className={authFieldClassName}
          label="Confirm password"
          labelClassName={authLabelClassName}
          name="confirmPassword"
          type="password"
        />
        <AuthFeedback
          error={reset.error ? getFirebaseErrorMessage(reset.error) : ""}
        />
        <GeneralButton
          className="w-full"
          disabled={reset.isPending}
          type="submit"
          variant="primary"
        >
          {reset.isPending ? "Updating password…" : "Reset password"}
        </GeneralButton>
        <Link
          className={`block text-center text-sm ${authLinkClassName}`}
          href="/forgot-password"
        >
          Request another reset link
        </Link>
      </AuthForm>
    </AuthCard>
  );
}
