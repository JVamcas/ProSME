"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { GeneralButton } from "@/shared/ui/Button";
import { CheckboxField } from "@/shared/ui/FormField";
import { FormInput } from "@/components/ui/form-fields";
import { FormDateTimeInput } from "@/shared/ui/FormDateTimeInput";
import type { EventRegistrationSettings } from "../../domain/EventRegistration";
import {
  eventSettingsFormSchema,
  eventSettingsTransport,
  localSettingsDate,
  type EventSettingsFormValues,
} from "../../api/EventSettingsFormSchema";
import { useEventSettings } from "./useEventOperations";

export function EventSettingsForm({
  eventId,
  settings,
  editable,
}: {
  eventId: number;
  settings: EventRegistrationSettings | null;
  editable: boolean;
}) {
  const mutation = useEventSettings(eventId);
  const form = useForm<EventSettingsFormValues>({
    resolver: zodResolver(eventSettingsFormSchema),
    defaultValues: {
      enabled: settings?.enabled ?? false,
      opensAt: localSettingsDate(settings?.opensAt),
      closesAt: localSettingsDate(settings?.closesAt),
      confirmationEnabled: settings?.confirmationEnabled ?? true,
      reminderEnabled: settings?.reminderEnabled ?? true,
      reminderHours: settings?.reminderHours ?? 24,
    },
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(eventSettingsTransport(values));
    } catch {
      // Keep input and announce the mutation failure below.
    }
  });
  return (
    <FormProvider {...form}>
      <form
        className="rounded-xl border border-slate-200 bg-white p-6"
        onSubmit={submit}
        noValidate
      >
        <fieldset
          className="grid gap-5"
          disabled={!editable || mutation.isPending}
        >
          <legend className="mb-5 text-xl font-bold">
            Registration settings
          </legend>
          <CheckboxField name="enabled" label="Enable registration" />
          <p className="text-sm text-slate-600">
            Opening and closing times use your device timezone (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormDateTimeInput
              name="opensAt"
              label="Registration opens (optional)"
            />
            <FormDateTimeInput
              name="closesAt"
              label="Registration closes (optional)"
            />
          </div>
          <h2
            id="event-email-settings"
            className="border-t pt-5 text-xl font-bold"
          >
            Event emails
          </h2>
          <CheckboxField
            name="confirmationEnabled"
            label="Send confirmation automatically after registration"
          />
          <CheckboxField name="reminderEnabled" label="Send event reminder" />
          <FormInput
            name="reminderHours"
            label="Hours before event"
            type="number"
            min={1}
            max={168}
            registrationOptions={{ valueAsNumber: true }}
          />
          <p className="text-sm text-slate-600">
            Reminders use the published event time. The initial reminder is 24
            hours before the event.
          </p>
          {editable ? (
            <GeneralButton type="submit" disabled={mutation.isPending}>
              Save settings
            </GeneralButton>
          ) : null}
        </fieldset>
      </form>
    </FormProvider>
  );
}
