"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { z } from "zod";
import { GeneralButton } from "@/shared/ui/Button";
import { CheckboxField, FormField } from "@/shared/ui/FormField";
import { Input } from "@/shared/ui/FormPrimitives";
import { chatbotContactSchema } from "../../api/ChatbotConversationSchemas";

export function ChatbotContactForm({
  busy,
  saved,
  onSave,
}: {
  busy: boolean;
  saved: boolean;
  onSave: (values: z.infer<typeof chatbotContactSchema>) => Promise<unknown>;
}) {
  const form = useForm<z.infer<typeof chatbotContactSchema>>({
    resolver: zodResolver(chatbotContactSchema),
    defaultValues: { name: "", email: "" },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await onSave(values);
      form.reset();
    } catch {
      // The request error is announced by the conversation panel.
    }
  });

  if (saved)
    return (
      <p role="status">Your contact details were saved for staff follow-up.</p>
    );

  return (
    <section className="space-y-4" aria-label="Optional staff follow-up">
      <h3 className="font-bold text-brand-navy">
        Would you like staff to contact you?
      </h3>
      <p className="text-sm leading-6">
        Optional contact details for staff follow-up.
      </p>
      <FormProvider {...form}>
        <form className="space-y-4" onSubmit={submit}>
          <FormField
            label="Name"
            htmlFor="chatbot-name"
            errorId="chatbot-name-error"
            error={form.formState.errors.name?.message}
          >
            <Input
              id="chatbot-name"
              {...form.register("name")}
              maxLength={100}
              autoComplete="name"
              disabled={busy}
              aria-invalid={Boolean(form.formState.errors.name)}
              aria-describedby="chatbot-name-error"
            />
          </FormField>
          <FormField
            label="Email"
            htmlFor="chatbot-email"
            errorId="chatbot-email-error"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="chatbot-email"
              {...form.register("email")}
              type="email"
              maxLength={320}
              autoComplete="email"
              disabled={busy}
              aria-invalid={Boolean(form.formState.errors.email)}
              aria-describedby="chatbot-email-error"
            />
          </FormField>
          <CheckboxField
            name="consent"
            label="I agree to staff using these details to follow up on my question."
            disabled={busy}
          />
          <GeneralButton type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save contact details"}
          </GeneralButton>
        </form>
      </FormProvider>
    </section>
  );
}
