"use client";

import { useMemo } from "react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { DeleteButton } from "@/components/ui/action-buttons";
import type { DataTableColumn } from "@/shared/ui/DataTable";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import type {
  NotificationEventRuleDetail,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import type { NotificationChannelSummary } from "../api/NotificationTemplateSchemas";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";

export type NotificationRecipientRow = NotificationEventRuleUpdate["recipients"][number] & {
  id: string;
};

export function useNotificationRuleRecipientColumns({
  channels,
  form,
  recipients,
  rule,
  watchedRecipients,
}: {
  channels: NotificationChannelSummary[];
  form: UseFormReturn<NotificationEventRuleUpdate>;
  recipients: UseFieldArrayReturn<NotificationEventRuleUpdate, "recipients">;
  rule: NotificationEventRuleDetail | null;
  watchedRecipients: NotificationEventRuleUpdate["recipients"];
}) {
  return useMemo<DataTableColumn<NotificationRecipientRow>[]>(
    () => [
      {
        accessorKey: "recipientType",
        header: "Recipient",
        cell: ({ row }) => {
          const current = watchedRecipients[row.index];
          const targetDisplayName =
            current?.recipientType === "SPECIFIC_USER"
              ? rule?.recipientOptions.users.find(({ id }) => id === current.targetId)?.name
              : current?.recipientType === "SPECIFIC_ROLE"
                ? rule?.recipientOptions.roles.find(({ id }) => id === current.targetId)?.name
                : null;
          return (
            <div className="flex w-full items-start justify-between gap-4 sm:block">
              <div>
                <p className="font-semibold text-brand-navy">
                  {notificationRecipientLabel(row.original.recipientType)}
                </p>
                {targetDisplayName ? (
                  <p className="mt-1 text-xs text-brand-navy/55">{targetDisplayName}</p>
                ) : null}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                Recipient
              </span>
            </div>
          );
        },
      },
      {
        id: "channels",
        header: "Channels",
        enableSorting: false,
        cell: ({ row }) => {
          const selected = watchedRecipients[row.index]?.channelCodes ?? [];
          return (
            <div className="w-full">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
                Channels
              </span>
              <div className="flex min-w-0 flex-wrap gap-3">
                {channels.map((channel) => (
                  <label
                    className="flex items-center gap-2 text-sm text-brand-navy"
                    key={channel.code}
                  >
                    <Checkbox
                      disabled={!channel.isEnabled && !selected.includes(channel.code)}
                      value={channel.code}
                      {...form.register(`recipients.${row.index}.channelCodes`)}
                    />
                    {channel.displayName}
                    {!channel.isEnabled ? (
                      <span className="text-xs text-brand-navy/45">(disabled)</span>
                    ) : null}
                  </label>
                ))}
                {form.formState.errors.recipients?.[row.index]?.channelCodes ? (
                  <p className="w-full text-xs text-red-700">
                    Select at least one enabled channel.
                  </p>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        id: "required",
        header: "Required",
        enableSorting: false,
        cell: ({ row }) => (
          <label className="flex w-full items-center justify-between gap-4 text-sm font-medium text-brand-navy sm:block">
            <span className="sm:hidden">Required recipient</span>
            <Checkbox {...form.register(`recipients.${row.index}.isRequired`)} />
          </label>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="text-sm font-medium text-brand-navy sm:hidden">Remove recipient</span>
            <DeleteButton
              disabled={recipients.fields.length === 1}
              onClick={() => recipients.remove(row.index)}
              title={`Remove ${notificationRecipientLabel(row.original.recipientType)}`}
            />
          </div>
        ),
      },
    ],
    [channels, form, recipients, rule, watchedRecipients],
  );
}
