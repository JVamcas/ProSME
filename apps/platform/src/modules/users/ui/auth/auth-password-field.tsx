import Link from "next/link";

import { authNavigationHref } from "@/platform/auth/AuthNavigation";

import { FormInput } from "@/components/ui/form-fields";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
} from "./auth-styles";

type AuthPasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  showForgotPassword?: boolean;
  returnTo?: string;
};

export function AuthPasswordField({
  autoComplete,
  returnTo,
  showForgotPassword = false,
}: AuthPasswordFieldProps) {
  const forgotPasswordLink = showForgotPassword ? (
    <Link
      href={authNavigationHref("/forgot-password", returnTo)}
      className={`mb-2 text-xs ${authLinkClassName}`}
    >
      Forgot password?
    </Link>
  ) : null;

  return (
    <FormInput
      id="password"
      name="password"
      label="Password"
      labelAccessory={forgotPasswordLink}
      labelClassName={authLabelClassName}
      className={authFieldClassName}
      type="password"
      autoComplete={autoComplete}
    />
  );
}
