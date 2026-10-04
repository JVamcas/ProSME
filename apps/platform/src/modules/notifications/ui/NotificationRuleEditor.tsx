"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import {
  notificationEventRuleUpdateSchema,
  type NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import {
  relationshipRecipientTypesForEvent,
} from "../domain/NotificationRecipient";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";
import {
  useNotificationRule,
  useUpdateNotificationRule,
} from "./useNotificationAdministration";

export function NotificationRuleEditor({
  canUpdate,
  eventKey,
}: {
  canUpdate: boolean;
  eventKey: string;
}) {
  const query = useNotificationRule(eventKey);
  const mutation = useUpdateNotificationRule(eventKey);
  const form = useForm<NotificationEventRuleUpdate>({
    resolver: zodResolver(notificationEventRuleUpdateSchema),
  });
  const recipients = useFieldArray({
    control: form.control,
    name: "recipients",
  });
  useEffect(() => {
    if (query.data) {
      form.reset({
        eventEnabled: query.data.eventEnabled,
        expectedUpdatedAt: query.data.updatedAt,
        isEnabled: query.data.isEnabled,
        recipients: query.data.recipients.map((recipient) => {
          const base = {
            channelCodes: recipient.channelCodes,
            isRequired: recipient.isRequired,
          };
          if (recipient.recipientType === "SPECIFIC_USER") {
            return {
              ...base,
              recipientType: "SPECIFIC_USER" as const,
              targetId: recipient.targetId,
            };
          }
          if (recipient.recipientType === "SPECIFIC_ROLE") {
            return {
              ...base,
              recipientType: "SPECIFIC_ROLE" as const,
              targetId: recipient.targetId,
            };
          }
          return { ...base, recipientType: recipient.recipientType };
        }),
      });
    }
  }, [form, query.data]);
  if (query.isPending) return <p>Loading event rule…</p>;
  if (query.error || !query.data)
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Event rule not found."}
      </p>
    );
  return (
    <FormProvider {...form}>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) =>
          mutation.mutateAsync(values).then(() => undefined),
        )}
      >
        <section className="rounded-2xl border border-brand-navy/10 bg-white p-6">
          <p className="text-xs font-bold uppercase text-brand-navy/50">
            Immutable event key
          </p>
          <p className="font-mono text-sm text-brand-navy">
            {query.data.eventKey}
          </p>
          <h2 className="mt-4 text-xl font-bold text-brand-navy">
            {query.data.eventName}
          </h2>
          <p className="mt-1 text-sm text-brand-navy/65">
            {query.data.eventDescription}
          </p>
          <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <Checkbox
              disabled={!canUpdate}
              {...form.register("eventEnabled")}
            />{" "}
            Event enabled
          </label>
          <label className="mt-3 flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <Checkbox disabled={!canUpdate} {...form.register("isEnabled")} />{" "}
            Rule enabled
          </label>
        </section>
        {recipients.fields.map((recipient, index) => (
          <section
            className="rounded-2xl border border-brand-navy/10 bg-white p-6"
            key={recipient.id}
          >
            <input
              type="hidden"
              {...form.register(`recipients.${index}.recipientType`)}
            />
            <h2 className="font-bold text-brand-navy">
              {notificationRecipientLabel(recipient.recipientType)}
            </h2>
            <p className="font-mono text-xs text-brand-navy/55">
              {recipient.recipientType}
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-brand-navy">
              <Checkbox
                disabled={!canUpdate}
                {...form.register(`recipients.${index}.isRequired`)}
              />{" "}
              Required recipient
            </label>
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-brand-navy">
                Channel bindings
              </legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {query.data.channels.map((channel) => (
                  <label
                    className="flex items-center gap-3 rounded-xl border border-brand-navy/10 p-3 text-sm"
                    key={channel.code}
                  >
                    <Checkbox
                      disabled={!canUpdate || !channel.isEnabled}
                      value={channel.code}
                      {...form.register(`recipients.${index}.channelCodes`)}
                    />
                    <span>
                      {channel.displayName}{" "}
                      <span className="font-mono text-xs text-brand-navy/50">
                        {channel.code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
              {form.formState.errors.recipients?.[index]?.channelCodes ? (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  Select at least one enabled channel.
                </p>
              ) : null}
            </fieldset>
            {canUpdate ? (
              <GeneralButton
                className="mt-5"
                disabled={recipients.fields.length === 1}
                onClick={() => recipients.remove(index)}
                type="button"
                variant="outline"
              >
                Remove recipient type
              </GeneralButton>
            ) : null}
          </section>
        ))}
        {canUpdate ? (
          <section className="rounded-2xl border border-brand-navy/10 bg-white p-6">
            <h2 className="font-bold text-brand-navy">Add recipient type</h2>
            <p className="mt-1 text-sm text-brand-navy/65">
              Event rules determine who receives this notification.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {relationshipRecipientTypesForEvent(eventKey)
                .filter(
                  (type) =>
                    !recipients.fields.some(
                      (recipient) => recipient.recipientType === type,
                    ),
                )
                .map((type) => (
                  <GeneralButton
                    key={type}
                    onClick={() =>
                      recipients.append({
                        channelCodes: query.data.channels
                          .filter((channel) => channel.isEnabled)
                          .slice(0, 1)
                          .map((channel) => channel.code),
                        isRequired: true,
                        recipientType: type,
                      })
                    }
                    type="button"
                    variant="outline"
                  >
                    Add {notificationRecipientLabel(type).toLowerCase()}
                  </GeneralButton>
                ))}
            </div>
          </section>
        ) : null}
        {mutation.error ? (
          <p className="text-sm text-red-700" role="alert">
            {mutation.error.message}
          </p>
        ) : null}
        {canUpdate ? (
          <GeneralButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Saving…" : "Save event rule"}
          </GeneralButton>
        ) : null}
      </form>
    </FormProvider>
  );
}
