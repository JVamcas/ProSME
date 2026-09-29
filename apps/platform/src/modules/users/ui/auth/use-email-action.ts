"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";

import { authClientService } from "@/platform/auth/firebase/ClientAuthService";
import {
  newPasswordSchema,
  type NewPasswordValues,
} from "@/platform/auth/firebase/auth-form.schemas";

export function useEmailAction(mode: string | null, code: string | null) {
  const startedCode = useRef<string | null>(null);
  const verification = useMutation({
    mutationFn: authClientService.verifyEmailAction,
    retry: false,
  });
  const { mutate: verify } = verification;
  useEffect(() => {
    if (mode !== "verifyEmail" || !code || startedCode.current === code) return;
    startedCode.current = code;
    verify(code);
  }, [code, mode, verify]);

  const resetCode = useQuery({
    queryKey: ["auth", "password-reset-code", code],
    queryFn: () => authClientService.checkPasswordResetCode(code!),
    enabled: mode === "resetPassword" && Boolean(code),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const form = useForm<NewPasswordValues>({
    defaultValues: { password: "", confirmPassword: "" },
    resolver: zodResolver(newPasswordSchema),
    mode: "onTouched",
  });
  const reset = useMutation({
    mutationFn: (values: NewPasswordValues) =>
      authClientService.resetPassword(code!, values.password),
    onSuccess: () => form.reset(),
    retry: false,
  });
  return { form, reset, resetCode, verification };
}
