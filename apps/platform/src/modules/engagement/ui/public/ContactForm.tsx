"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/shared/ui/Button";
import { CheckboxField, HoneypotField } from "@/shared/ui/FormField";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import {
  contactSubmissionSchema,
  type ContactSubmission,
} from "@/modules/engagement/EngagementSchemas";
import { useContactSubmission } from "@/modules/engagement/EngagementHooks";

const fieldClassName =
  "rounded-[10px] border-brand-navy/20 bg-[#faf9f7] text-base text-brand-navy focus:border-brand-orange focus:ring-brand-orange/20";
const inputClassName = `${fieldClassName} lg:h-16`;
const labelClassName = "font-bold text-base text-brand-navy lg:text-lg";

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
        className={inputClassName}
      />
      <FormInput
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        labelClassName={labelClassName}
        className={inputClassName}
      />
      <FormInput
        label={
          <>
            Phone <span className="font-normal">(optional)</span>
          </>
        }
        name="phone"
        type="tel"
        autoComplete="tel"
        labelClassName={labelClassName}
        className={inputClassName}
      />
      <FormInput
        label="Subject"
        name="subject"
        labelClassName={labelClassName}
        className={inputClassName}
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
        rows={4}
        labelClassName={labelClassName}
        className={fieldClassName}
      />
      <div className="sm:col-span-2">
        <CheckboxField
          name="consent"
          containerClassName="text-sm leading-6 text-brand-navy"
          controlClassName="size-5 accent-brand-orange"
          label={
            <>
              I consent to the SME Fund using this information to respond to my
              enquiry. See the{" "}
              <a
                href="/privacy"
                className="text-brand-navy underline underline-offset-2"
              >
                privacy policy
              </a>
              .
            </>
          }
        />
      </div>
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
        className="min-h-12 w-full px-7 text-base sm:w-auto"
      >
        {pending ? "Sending…" : "Send message"}
        <Send className="size-5" aria-hidden="true" />
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
        className="grid min-w-0 gap-x-6 gap-y-6 p-6 sm:grid-cols-2 sm:p-9 lg:gap-x-8 lg:p-12"
        aria-labelledby="contact-form-heading"
        aria-describedby="contact-status"
        noValidate
      >
        <div className="mb-1 border-b border-brand-navy/20 pb-6 sm:col-span-2">
          <h2
            id="contact-form-heading"
            className="text-3xl font-bold tracking-tight text-brand-navy lg:text-4xl"
          >
            Send us a message
          </h2>
          <p className="mt-2 text-base text-brand-navy/75 lg:text-lg">
            For general questions and enquiries.
          </p>
        </div>
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
