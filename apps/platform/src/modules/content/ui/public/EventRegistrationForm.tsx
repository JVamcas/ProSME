"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton } from "@/shared/ui/Button";
import { CheckboxField } from "@/shared/ui/FormField";
import { FormInput } from "@/components/ui/form-fields";
import { getErrorMessage } from "@/lib/client-http";
import { eventRegistrationSchema } from "../../api/EventRegistrationSchemas";
import { useEventRegistration } from "./useEventRegistration";

type FormValues = z.input<typeof eventRegistrationSchema>;

export function EventRegistrationForm({
  eventId,
  eventTitle,
  showHeading = true,
}: {
  eventId: number;
  eventTitle: string;
  showHeading?: boolean;
}) {
  const mutation = useEventRegistration(eventId);
  const form = useForm<FormValues>({
    defaultValues: {
      email: "",
      emailConsent: false,
      fullName: "",
      organisation: "",
    },
    resolver: zodResolver(eventRegistrationSchema),
  });

  const submit = form.handleSubmit(async (input) => {
    if (mutation.isPending || mutation.isSuccess) {
      return;
    }
    try {
      await mutation.mutateAsync(eventRegistrationSchema.parse(input));
    } catch {
      // The mutation error is announced below while retaining the entered values.
    }
  });

  if (mutation.isSuccess) {
    return (
      <div
        aria-live="polite"
        className="rounded-xl bg-brand-green/10 p-6 text-brand-navy"
        role="status"
      >
        <CheckCircle2 className="size-8 text-brand-green" aria-hidden="true" />
        <h2 className="mt-4 text-2xl font-bold">Registration confirmed</h2>
        <p className="mt-2 text-sm leading-6">
          Your place for {eventTitle} has been recorded. If this email was
          already registered, no duplicate was created.
        </p>
      </div>
    );
  }

  return (
    <section
      aria-label={showHeading ? undefined : `Register for ${eventTitle}`}
      aria-labelledby={
        showHeading ? `registration-heading-${eventId}` : undefined
      }
      className="rounded-xl bg-brand-cream p-6 sm:p-8"
    >
      {showHeading ? (
        <>
          <h2
            className="text-2xl font-bold text-brand-navy"
            id={`registration-heading-${eventId}`}
          >
            Register for this session
          </h2>
          <p className="mt-1 text-sm text-brand-navy/70">
            Secure your spot for <strong>{eventTitle}</strong>.
          </p>
        </>
      ) : null}
      <FormProvider {...form}>
        <form
          className={showHeading ? "mt-6 grid gap-4" : "grid gap-4"}
          noValidate
          onSubmit={submit}
        >
          <FormInput
            autoComplete="name"
            label="Full name"
            name="fullName"
            required
          />
          <FormInput
            autoComplete="email"
            label="Email address"
            name="email"
            required
            type="email"
          />
          <FormInput label="Organisation (optional)" name="organisation" />
          <CheckboxField
            label="Email me confirmation and reminders for this event."
            name="emailConsent"
            required
          />
          <GeneralButton
            className="mt-1 w-full rounded-lg"
            disabled={form.formState.isSubmitting || mutation.isPending}
            type="submit"
          >
            {form.formState.isSubmitting || mutation.isPending ? (
              <>
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
                Registering…
              </>
            ) : (
              "Register"
            )}
          </GeneralButton>
          {mutation.error ? (
            <p className="text-sm text-red-700" role="alert">
              {getErrorMessage(mutation.error) ??
                "Registration could not be completed."}
            </p>
          ) : null}
        </form>
      </FormProvider>
    </section>
  );
}
