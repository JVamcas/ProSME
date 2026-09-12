"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuthFeedback } from "./auth-feedback";
import {
  authLinkClassName,
  authSupportingTextClassName,
} from "./auth-styles";
import { useEmailVerification } from "./use-email-verification";

export function EmailVerificationPanel() {
  const verification = useEmailVerification();
  const canManage = Boolean(verification.status && !verification.status.verified);

  return (
    <div className="space-y-4">
      {verification.loading ? (
        <p className={authSupportingTextClassName}>
          Loading verification status…
        </p>
      ) : null}
      {verification.status?.email ? (
        <p className="text-sm leading-6 text-brand-navy/75">
          We sent the verification link to{" "}
          <strong className="text-brand-navy">
            {verification.status.email}
          </strong>
          .
        </p>
      ) : null}
      <AuthFeedback
        error={verification.error}
        notice={verification.notice}
      />
      <Button
        type="button"
        variant="brand"
        className="w-full"
        disabled={!canManage || verification.busy}
        onClick={verification.resendLink}
      >
        {verification.busy ? "Please wait…" : "Resend verification link"}
      </Button>
      <Button
        type="button"
        variant="navy"
        className="w-full"
        disabled={!verification.status || verification.busy}
        onClick={verification.checkVerification}
      >
        I have verified my email
      </Button>
      <p className={authSupportingTextClassName}>
        Already verified or using another browser?{" "}
        <Link className={authLinkClassName} href="/sign-in">
          Continue to sign in
        </Link>
      </p>
    </div>
  );
}
