"use client";

import type { NotificationRecipientType } from "../domain/NotificationRecipient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DataTable } from "@/shared/ui/DataTable";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import {
  notificationEventRuleUpdateSchema,
  type NotificationEventRuleDetail,
  type NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import type { NotificationChannelSummary } from "../api/NotificationTemplateSchemas";
import { NotificationRuleAddRecipientDialog } from "./NotificationRuleAddRecipientDialog";
import {
  useNotificationRuleRecipientColumns,
  type NotificationRecipientRow,
} from "./useNotificationRuleRecipientColumns";

import { notificationRuleDetailUpdateValues } from "./NotificationRuleUpdateValues";

export function NotificationRuleRecipientsDialog({
  allowedRecipientTypes,
  channels,
  isPending,
  onClose,
  onSubmit,
  rule,
}: {
  allowedRecipientTypes?: readonly NotificationRecipientType[];
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
    form.reset(notificationRuleDetailUpdateValues(rule));
  }, [form, rule]);

  const watchedRecipientValues = useWatch({
    control: form.control,
    name: "recipients",
  });
  const watchedRecipients = useMemo(
    () => watchedRecipientValues ?? [],
    [watchedRecipientValues],
  );
  const columns = useNotificationRuleRecipientColumns({
    channels,
    form,
    recipients,
    rule,
    watchedRecipients,
  });
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
              data={recipients.fields as NotificationRecipientRow[]}
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
          allowedRecipientTypes={allowedRecipientTypes}
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
