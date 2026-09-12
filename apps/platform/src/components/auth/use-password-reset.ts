"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { authClientService } from "@/auth/firebase/auth-client.service";
import {
  passwordResetSchema,
  type PasswordResetValues,
} from "@/auth/firebase/auth-form.schemas";
import { getFirebaseErrorMessage } from "@/auth/firebase/errors";

const resetNotice =
  "If an account exists for that email, reset instructions have been sent.";

export function usePasswordReset() {
  const [notice, setNotice] = useState("");
  const form = useForm<PasswordResetValues>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(passwordResetSchema),
  });
  const reset = useMutation({
    mutationFn: authClientService.requestPasswordReset,
  });

  async function submit(values: PasswordResetValues) {
    setNotice("");
    reset.reset();

    try {
      await reset.mutateAsync(values);
      setNotice(resetNotice);
    } catch {
      // Mutation state supplies the message returned below.
    }
  }

  return {
    busy: reset.isPending,
    error: reset.isError ? getFirebaseErrorMessage(reset.error) : "",
    form,
    notice,
    submit,
  };
}
