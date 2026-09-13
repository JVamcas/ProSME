"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";

import { authClientService } from "@/auth/firebase/auth-client.service";
import { Button } from "@/components/ui/button";

export function ProfilePasswordPanel({ email }: { email: string }) {
  const reset = useMutation({
    mutationFn: () => authClientService.requestPasswordReset({ email }),
  });

  return (
    <section className="rounded-2xl border border-brand-navy/15 bg-brand-white p-5 shadow-sm sm:p-7">
      <span className="grid size-11 place-items-center rounded-xl bg-brand-orange/10">
        <KeyRound aria-hidden="true" className="size-5 text-brand-orange" />
      </span>
      <h2 className="mt-4 text-2xl font-bold text-brand-navy">
        Change password
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-brand-navy/70">
        We will send secure password-reset instructions to {email}. Your
        existing password remains active until you complete the reset.
      </p>
      {reset.isSuccess ? (
        <p
          className="mt-5 rounded-xl bg-brand-green/10 p-4 text-sm font-semibold text-brand-navy"
          role="status"
        >
          Reset instructions have been sent if the account is available.
        </p>
      ) : null}
      {reset.isError ? (
        <p
          className="mt-5 border-l-4 border-brand-orange bg-brand-cream p-4 text-sm font-semibold text-brand-navy"
          role="alert"
        >
          Reset instructions could not be sent. Please try again.
        </p>
      ) : null}
      <Button
        className="mt-6"
        disabled={reset.isPending}
        onClick={() => reset.mutate()}
        type="button"
      >
        <KeyRound aria-hidden="true" className="size-4" />
        {reset.isPending ? "Sending…" : "Send reset instructions"}
      </Button>
    </section>
  );
}
