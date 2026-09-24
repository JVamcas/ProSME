"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField, HoneypotField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import {
  contactSubmissionSchema,
  type ContactSubmission,
} from "@/modules/engagement/EngagementSchemas";
import { useContactSubmission } from "@/modules/engagement/EngagementHooks";

const fieldClassName =
  "border-brand-blue/40 bg-brand-white text-base text-brand-navy focus:border-brand-orange focus:ring-brand-orange/20";
const labelClassName = "font-bold text-brand-navy";

function useContactForm() {
  const submission = useContactSubmission();
  const form = useForm<ContactSubmission>({
    defaultValues: {
      company: "",
      consent: false,
      email: "",
      message: "",
      name: "",
      phone: "",
      subject: "",
    },
    mode: "onTouched",
    resolver: zodResolver(contactSubmissionSchema),
  });

  async function submit(values: ContactSubmission) {
    try {
      await submission.mutateAsync(values);
      form.reset();
    } catch {
      // The mutation exposes the service error in the status region.
    }
  }

  return { form, submission, submit };
}

function ContactIdentityFields() {
  return (
    <>
      <FormInput
        label="Name"
        name="name"
        autoComplete="name"
        labelClassName={labelClassName}
        className={fieldClassName}
      />
      <FormInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        labelClassName={labelClassName}
        className={fieldClassName}
      />
      <FormInput
        label="Phone (optional)"
        name="phone"
        type="tel"
        autoComplete="tel"
        labelClassName={labelClassName}
        className={fieldClassName}
      />
      <FormInput
        label="Subject"
        name="subject"
        labelClassName={labelClassName}
        className={fieldClassName}
      />
    </>
  );
}

function ContactMessageFields() {
  return (
    <>
      <HoneypotField />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="Message"
        name="message"
        rows={6}
        labelClassName={labelClassName}
        className={fieldClassName}
      />
      <CheckboxField
        name="consent"
        containerClassName="sm:col-span-2 text-sm leading-5 text-brand-navy/75"
        controlClassName="accent-brand-orange"
        label={
          <>
            I consent to the SME Fund using this information to respond to my
            enquiry. See the{" "}
            <a
              href="/privacy"
              className="font-bold text-brand-navy underline"
            >
              privacy policy
            </a>
            .
          </>
        }
      />
    </>
  );
}

type ContactActionsProps = {
  error?: string;
  isError: boolean;
  message?: string;
  pending: boolean;
};

function ContactActions({
  error,
  isError,
  message,
  pending,
}: ContactActionsProps) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
      <GeneralButton
        type="submit"
        variant="primary"
        size="lg"
        disabled={pending}
        className="min-h-12 shadow-[0_8px_20px_rgba(10,24,59,0.18)]"
      >
        {pending ? "Sending…" : "Send message"}
        <Send className="size-4" />
      </GeneralButton>
      <p
        id="contact-status"
        role="status"
        className={
          isError ? "text-sm text-brand-navy" : "text-sm text-green-dark"
        }
      >
        {error ?? message}
      </p>
    </div>
  );
}

export function ContactForm() {
  const contact = useContactForm();

  return (
    <FormProvider {...contact.form}>
      <form
        onSubmit={contact.form.handleSubmit(contact.submit)}
        className="grid gap-5 rounded-2xl border border-brand-blue/25 bg-brand-white p-6 shadow-[0_12px_35px_rgba(10,24,59,0.08)] sm:grid-cols-2"
        aria-describedby="contact-status"
        noValidate
      >
        <ContactIdentityFields />
        <ContactMessageFields />
        <ContactActions
          error={contact.submission.error?.message}
          isError={contact.submission.isError}
          message={contact.submission.data?.message}
          pending={contact.submission.isPending}
        />
      </form>
    </FormProvider>
  );
}
