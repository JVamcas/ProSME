"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-fields";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import {
  notificationChannelUpdateSchema,
  type NotificationChannelSummary,
  type NotificationChannelUpdate,
} from "../api/NotificationTemplateSchemas";
import { useUpdateNotificationChannel } from "./NotificationTemplateHooks";

export function NotificationChannelEditor({
  channel,
  onClose,
}: {
  channel: NotificationChannelSummary | null;
  onClose: () => void;
}) {
  const mutation = useUpdateNotificationChannel(channel?.code ?? "");
  const resetMutation = mutation.reset;
  const form = useForm<NotificationChannelUpdate>({
    resolver: zodResolver(notificationChannelUpdateSchema),
  });

  useEffect(() => {
    if (!channel) return;
    resetMutation();
    form.reset({
      expectedUpdatedAt: channel.updatedAt,
      isEnabled: channel.isEnabled,
      sortOrder: channel.sortOrder,
    });
  }, [channel, form, resetMutation]);

  const formId = "notification-channel-editor";

  return (
    <RightDrawer
      description="Control whether this delivery channel is available and where it appears."
      footer={(
        <div className="flex justify-end gap-3">
          <GeneralButton onClick={onClose} variant="outline">
            Cancel
          </GeneralButton>
          <GeneralButton
            disabled={mutation.isPending || !form.formState.isDirty}
            form={formId}
            type="submit"
          >
            {mutation.isPending ? "Saving…" : "Save channel"}
          </GeneralButton>
        </div>
      )}
      onClose={onClose}
      open={channel !== null}
      size="md"
      title={`Edit ${channel?.displayName ?? "channel"}`}
    >
      <FormProvider {...form}>
        <form
          className="space-y-5"
          id={formId}
          onSubmit={form.handleSubmit(async (values) => {
            await mutation.mutateAsync(values);
            onClose();
          })}
        >
          <div className="rounded-xl bg-brand-cream p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/55">
              Channel code
            </p>
            <p className="mt-1 font-mono text-sm text-brand-navy">
              {channel?.code}
            </p>
          </div>
          <FormInput
            label="Sort order"
            min={0}
            name="sortOrder"
            registrationOptions={{ valueAsNumber: true }}
            required
            type="number"
          />
          <label className="flex items-center gap-3 text-sm font-semibold text-brand-navy">
            <Checkbox {...form.register("isEnabled")} />
            Channel enabled
          </label>
          {mutation.error ? (
            <p className="text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
        </form>
      </FormProvider>
    </RightDrawer>
  );
}
