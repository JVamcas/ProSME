"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { authClientService } from "@/platform/auth/firebase/ClientAuthService";
import { getFirebaseErrorMessage } from "@/platform/auth/firebase/errors";

const verificationQueryKey = ["auth", "email-verification"] as const;

export function emailVerificationNotice(
  resendSucceeded: boolean,
  verified?: boolean,
) {
  if (resendSucceeded) {
    return "A new verification link has been sent. Check your inbox and spam folder.";
  }

  if (verified === false) {
    return "Your email address is not verified yet. Open the verification link we emailed you, then select “I have verified my email” again.";
  }

  return "";
}

export function useEmailVerification() {
  const router = useRouter();
  const status = useQuery({
    queryFn: authClientService.getEmailVerificationStatus,
    queryKey: verificationQueryKey,
    retry: false,
  });
  const resend = useMutation({
    mutationFn: authClientService.resendVerificationEmail,
  });
  const verification = useMutation({
    mutationFn: authClientService.completeEmailVerification,
    onSuccess(verified) {
      if (verified) {
        router.replace("/sign-in");
      }
    },
  });

  function resendLink() {
    verification.reset();
    resend.mutate();
  }

  function checkVerification() {
    resend.reset();
    verification.mutate();
  }

  const caughtError = resend.error ?? verification.error ?? status.error;
  const notice = emailVerificationNotice(resend.isSuccess, verification.data);

  return {
    busy: resend.isPending || verification.isPending,
    checkVerification,
    error: caughtError ? getFirebaseErrorMessage(caughtError) : "",
    loading: status.isPending,
    notice,
    resendLink,
    status: status.data,
  };
}
