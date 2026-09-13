"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { CheckboxField, HoneypotField } from "@/components/ui/form-field";
import { FormInput } from "@/components/ui/form-fields";
import {
  newsletterSubscriptionSchema,
  type NewsletterSubscription,
} from "@/modules/engagement/engagement.schema";
import { useNewsletterSubscription } from "@/modules/engagement/engagement.hooks";

function useNewsletterForm() {
  const subscription = useNewsletterSubscription();
  const form = useForm<NewsletterSubscription>({
    defaultValues: {
      company: "",
      consent: false,
      email: "",
    },
    mode: "onTouched",
    resolver: zodResolver(newsletterSubscriptionSchema),
  });

  async function submit(values: NewsletterSubscription) {
    try {
      await subscription.mutateAsync(values);
      form.reset();
    } catch {
      // The mutation exposes the service error in the status region.
    }
  }

  return { form, submission: subscription, submit };
}

function NewsletterFields({ pending }: { pending: boolean }) {
  return (
    <>
      <HoneypotField />
      <div className="flex rounded-full bg-white p-1">
        <FormInput
          id="newsletter-email"
          name="email"
          label="Email address"
          labelClassName="sr-only"
          containerClassName="min-w-0 flex-1"
          type="email"
          autoComplete="email"
          placeholder="Your email address"
          className="h-full min-w-0 border-0 bg-transparent px-4 text-sm text-brand-navy focus:ring-0"
        />
        <Button
          type="submit"
          variant="navy"
          size="sm"
          disabled={pending}
          className="min-h-10 shrink-0"
          aria-label="Subscribe"
        >
          {pending ? "Submitting…" : "Subscribe"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
      <CheckboxField
        name="consent"
        containerClassName="mt-3 gap-2 text-[11px] leading-4 text-brand-navy"
        controlClassName="mt-0.5 accent-navy"
        label={
          <>
            I agree to receive SME Fund updates and accept the{" "}
            <a href="/privacy" className="underline">
              privacy policy
            </a>
            .
          </>
        }
      />
    </>
  );
}

function NewsletterStatus({
  pending,
  message,
}: {
  pending: boolean;
  message?: string;
}) {
  return (
    <p className="mt-2 min-h-4 text-xs text-brand-navy" role="status">
      {pending ? "Submitting…" : message}
    </p>
  );
}

export function NewsletterForm() {
  const newsletter = useNewsletterForm();
  const message =
    newsletter.submission.error?.message ?? newsletter.submission.data?.message;

  return (
    <FormProvider {...newsletter.form}>
      <form
        onSubmit={newsletter.form.handleSubmit(newsletter.submit)}
        className="mt-4"
        noValidate
      >
        <NewsletterFields pending={newsletter.submission.isPending} />
        <NewsletterStatus
          pending={newsletter.submission.isPending}
          message={message}
        />
      </form>
    </FormProvider>
  );
}
