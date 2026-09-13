"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { authClientService } from "@/auth/firebase/ClientAuthService";
import {
  signInSchema,
  type SignInValues,
} from "@/auth/firebase/auth-form.schemas";
import { getFirebaseErrorMessage } from "@/auth/firebase/errors";

function signInError(error: unknown) {
  if (error instanceof Error && error.message === "email-not-verified") {
    return "Verify your email before signing in. We sent you a new verification email.";
  }

  return getFirebaseErrorMessage(error);
}

export function useSignIn(nextPath?: string) {
  const router = useRouter();
  const form = useForm<SignInValues>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
    resolver: zodResolver(signInSchema),
  });
  const signIn = useMutation({
    mutationFn: authClientService.signIn,
  });

  async function submit(values: SignInValues) {
    signIn.reset();

    try {
      const session = await signIn.mutateAsync(values);
      router.replace(nextPath ?? session.defaultPath);
      router.refresh();
    } catch (caught) {
      if (caught instanceof Error && caught.message === "email-not-verified") {
        router.replace("/verify-email");
      }
    }
  }

  return {
    busy: signIn.isPending,
    error: signIn.isError ? signInError(signIn.error) : "",
    form,
    submit,
  };
}
