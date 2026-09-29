"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { authClientService } from "@/platform/auth/firebase/ClientAuthService";
import {
  registrationSchema,
  type RegistrationValues,
} from "@/platform/auth/firebase/auth-form.schemas";
import { getFirebaseErrorMessage } from "@/platform/auth/firebase/errors";

export function useRegistration() {
  const router = useRouter();
  const form = useForm<RegistrationValues>({
    defaultValues: {
      confirmPassword: "",
      email: "",
      firstName: "",
      password: "",
      surname: "",
    },
    mode: "onTouched",
    resolver: zodResolver(registrationSchema),
  });
  const registration = useMutation({
    mutationFn: authClientService.registerAccount,
  });

  async function submit(values: RegistrationValues) {
    registration.reset();

    try {
      await registration.mutateAsync(values);
      router.replace("/verify-email");
    } catch {
      // Mutation state supplies the message returned below.
    }
  }

  return {
    busy: registration.isPending,
    error: registration.isError
      ? getFirebaseErrorMessage(registration.error)
      : "",
    form,
    submit,
  };
}
