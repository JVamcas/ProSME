import Link from "next/link";

import { FormInput } from "@/components/ui/form-fields";
import {
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
} from "./auth-styles";

type AuthPasswordFieldProps = {
  autoComplete: "current-password" | "new-password";
  showForgotPassword?: boolean;
};

export function AuthPasswordField({
  autoComplete,
  showForgotPassword = false,
}: AuthPasswordFieldProps) {
  const forgotPasswordLink = showForgotPassword ? (
    <Link
      href="/forgot-password"
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
