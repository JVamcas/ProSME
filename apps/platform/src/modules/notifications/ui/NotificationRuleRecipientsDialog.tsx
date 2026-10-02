"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";

import { DeleteButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { Checkbox } from "@/shared/ui/FormPrimitives";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import {
  notificationEventRuleUpdateSchema,
  type NotificationEventRuleDetail,
  type NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import type { NotificationChannelSummary } from "../api/NotificationTemplateSchemas";
import { NotificationRuleAddRecipientDialog } from "./NotificationRuleAddRecipientDialog";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";

type RecipientRow = NotificationEventRuleUpdate["recipients"][number] & {
  id: string;
};

export function NotificationRuleRecipientsDialog({
  channels,
  isPending,
  onClose,
  onSubmit,
  rule,
}: {
  channels: NotificationChannelSummary[];
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: NotificationEventRuleUpdate) => Promise<void>;
  rule: NotificationEventRuleDetail | null;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const form = useForm<NotificationEventRuleUpdate>({
    resolver: zodResolver(notificationEventRuleUpdateSchema),
  });
  const recipients = useFieldArray({
    control: form.control,
    name: "recipients",
  });

  useEffect(() => {
    if (!rule) return;
    form.reset({
      eventEnabled: rule.eventEnabled,
      expectedUpdatedAt: rule.updatedAt,
      isEnabled: rule.isEnabled,
      recipients: rule.recipients.map((recipient) => {
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
  }, [form, rule]);

  const watchedRecipientValues = useWatch({
    control: form.control,
    name: "recipients",
  });
  const watchedRecipients = useMemo(
    () => watchedRecipientValues ?? [],
    [watchedRecipientValues],
  );
  const columns = useMemo<DataTableColumn<RecipientRow>[]>(
    () => [
      {
        accessorKey: "recipientType",
        header: "Recipient",
        cell: ({ row }) => {
          const current = watchedRecipients[row.index];
          const targetDisplayName =
            current?.recipientType === "SPECIFIC_USER"
              ? rule?.recipientOptions.users.find(
                  ({ id }) => id === current.targetId,
                )?.name
              : current?.recipientType === "SPECIFIC_ROLE"
                ? rule?.recipientOptions.roles.find(
                    ({ id }) => id === current.targetId,
                  )?.name
                : null;
          return (
            <div className="flex w-full items-start justify-between gap-4 sm:block">
              <div>
                <p className="font-semibold text-brand-navy">
                  {notificationRecipientLabel(row.original.recipientType)}
                </p>
                {targetDisplayName ? (
                  <p className="mt-1 text-xs text-brand-navy/55">
                    {targetDisplayName}
                  </p>
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
                      disabled={
                        !channel.isEnabled && !selected.includes(channel.code)
                      }
                      value={channel.code}
                      {...form.register(
                        `recipients.${row.index}.channelCodes`,
                      )}
                    />
                    {channel.displayName}
                    {!channel.isEnabled ? (
                      <span className="text-xs text-brand-navy/45">
                        (disabled)
                      </span>
                    ) : null}
                  </label>
                ))}
                {form.formState.errors.recipients?.[row.index]
                  ?.channelCodes ? (
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
            <Checkbox
              {...form.register(`recipients.${row.index}.isRequired`)}
            />
          </label>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex w-full items-center justify-between gap-4">
            <span className="text-sm font-medium text-brand-navy sm:hidden">
              Remove recipient
            </span>
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
  const formId = "notification-rule-recipients";
  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <RightDrawer
      footer={
        <div className="flex justify-end gap-3">
          <GeneralButton
            disabled={isPending}
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </GeneralButton>
          <GeneralButton
            disabled={isPending || !form.formState.isDirty}
            form={formId}
            type="submit"
          >
            {isPending ? "Saving…" : "Save recipients"}
          </GeneralButton>
        </div>
      }
      onClose={handleClose}
      open={rule !== null}
      size="xl"
      title="Manage recipients"
    >
      <FormProvider {...form}>
        <form
          className="space-y-5"
          id={formId}
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="max-sm:[&_table]:block max-sm:[&_thead]:hidden max-sm:[&_tbody]:block max-sm:[&_tbody]:divide-y-0 max-sm:[&_tbody_tr]:mb-3 max-sm:[&_tbody_tr]:block max-sm:[&_tbody_tr]:overflow-hidden max-sm:[&_tbody_tr]:rounded-lg max-sm:[&_tbody_tr]:border max-sm:[&_tbody_tr]:border-slate-200 max-sm:[&_tbody_td]:flex max-sm:[&_tbody_td]:h-auto max-sm:[&_tbody_td]:min-h-12 max-sm:[&_tbody_td]:items-center max-sm:[&_tbody_td]:border-b max-sm:[&_tbody_td]:border-slate-100 max-sm:[&_tbody_td]:px-4 max-sm:[&_tbody_td]:py-3 max-sm:[&_tbody_td:last-child]:border-b-0">
            <DataTable
              columns={columns}
              data={recipients.fields as RecipientRow[]}
              emptyMessage="No recipients are configured."
              rowKey={(recipient) => recipient.id}
              toolbar={{
                description:
                  "Choose who receives this event notification and through which channels.",
                title: "Recipients",
              }}
            />
          </div>
          <GeneralButton
            onClick={() => setIsAdding(true)}
            size="sm"
            type="button"
            variant="outline"
          >
            + Add Recipient
          </GeneralButton>
          {form.formState.errors.recipients?.root ? (
            <p className="text-sm text-red-700" role="alert">
              At least one recipient is required.
            </p>
          ) : null}
        </form>
      </FormProvider>
      {rule ? (
        <NotificationRuleAddRecipientDialog
          channels={channels}
          existingRecipients={watchedRecipients}
          isOpen={isAdding}
          onAdd={(recipient) => recipients.append(recipient)}
          onClose={() => setIsAdding(false)}
          options={rule.recipientOptions}
        />
      ) : null}
    </RightDrawer>
  );
}
