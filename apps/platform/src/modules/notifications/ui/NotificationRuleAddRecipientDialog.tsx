"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import {
  Checkbox,
  FieldError,
  Label,
  Select,
} from "@/shared/ui/FormPrimitives";
import type { NotificationEventRuleUpdate } from "../api/NotificationAdministrationSchemas";
import type { NotificationChannelSummary } from "../api/NotificationTemplateSchemas";
import {
  notificationRecipientTypes,
  type NotificationRecipientType,
} from "../domain/NotificationRecipient";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";

const addRecipientSchema = z
  .object({
    channelCodes: z.array(z.string()).min(1, "Select at least one channel."),
    recipientType: z.enum(notificationRecipientTypes),
    targetId: z.string(),
  })
  .superRefine((value, context) => {
    if (
      (value.recipientType === "SPECIFIC_USER" ||
        value.recipientType === "SPECIFIC_ROLE") &&
      !value.targetId
    ) {
      context.addIssue({
        code: "custom",
        message: `Select a ${value.recipientType === "SPECIFIC_USER" ? "user" : "role"}.`,
        path: ["targetId"],
      });
    }
  });

type AddRecipientValues = z.infer<typeof addRecipientSchema>;
type Recipient = NotificationEventRuleUpdate["recipients"][number];

type Props = {
  allowedRecipientTypes?: readonly NotificationRecipientType[];
  channels: NotificationChannelSummary[];
  existingRecipients: Recipient[];
  isOpen: boolean;
  onAdd: (recipient: Recipient) => void;
  onClose: () => void;
  options: {
    roles: Array<{ id: string; name: string }>;
    users: Array<{ email: string; id: string; name: string }>;
  };
};

export function NotificationRuleAddRecipientDialog({
  channels,
  allowedRecipientTypes = notificationRecipientTypes,
  existingRecipients,
  isOpen,
  onAdd,
  onClose,
  options,
}: Props) {
  const form = useForm<AddRecipientValues>({
    defaultValues: {
      channelCodes: [],
      recipientType: "APPLICATION_OWNER",
      targetId: "",
    },
    resolver: zodResolver(addRecipientSchema),
  });
  const recipientType = useWatch({
    control: form.control,
    name: "recipientType",
  });

  useEffect(() => {
    if (!isOpen) return;
    const firstAvailableType =
      allowedRecipientTypes.find(
        (type) =>
          type === "SPECIFIC_USER" ||
          type === "SPECIFIC_ROLE" ||
          !existingRecipients.some(
            (recipient) => recipient.recipientType === type,
          ),
      ) ?? "SPECIFIC_USER";
    form.reset({
      channelCodes: [],
      recipientType: firstAvailableType,
      targetId: "",
    });
  }, [allowedRecipientTypes, existingRecipients, form, isOpen]);

  function isUnavailable(type: AddRecipientValues["recipientType"]) {
    if (type === "SPECIFIC_USER" || type === "SPECIFIC_ROLE") return false;
    return existingRecipients.some(
      (recipient) => recipient.recipientType === type,
    );
  }

  function submit(values: AddRecipientValues) {
    const targetId =
      values.recipientType === "SPECIFIC_USER" ||
      values.recipientType === "SPECIFIC_ROLE"
        ? values.targetId
        : undefined;
    const duplicate = existingRecipients.some(
      (recipient) =>
        recipient.recipientType === values.recipientType &&
        (recipient.targetId ?? undefined) === targetId,
    );
    if (duplicate) {
      form.setError("targetId", {
        message: "That recipient is already in the table.",
      });
      return;
    }
    onAdd({
      channelCodes: values.channelCodes,
      isRequired: true,
      recipientType: values.recipientType,
      ...(targetId ? { targetId } : {}),
    } as Recipient);
    onClose();
  }

  const targetedOptions =
    recipientType === "SPECIFIC_USER"
      ? options.users.map((user) => ({
          id: user.id,
          label: `${user.name} (${user.email})`,
        }))
      : options.roles.map((role) => ({ id: role.id, label: role.name }));

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Add Recipient"
    >
      <FormProvider {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="notification-recipient-type">Recipient</Label>
              <Select
                id="notification-recipient-type"
                {...form.register("recipientType", {
                  onChange: () => form.setValue("targetId", ""),
                })}
              >
                {allowedRecipientTypes.map((type) => (
                  <option
                    disabled={isUnavailable(type)}
                    key={type}
                    value={type}
                  >
                    {notificationRecipientLabel(type)}
                  </option>
                ))}
              </Select>
            </div>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold text-brand-navy">
                Channels
              </legend>
              <div className="flex flex-wrap gap-x-5 gap-y-3">
                {channels.map((channel) => (
                  <label
                    className="flex items-center gap-2 text-sm text-brand-navy"
                    key={channel.code}
                  >
                    <Checkbox
                      disabled={!channel.isEnabled}
                      value={channel.code}
                      {...form.register("channelCodes")}
                    />
                    {channel.displayName}
                  </label>
                ))}
              </div>
              <FieldError
                message={form.formState.errors.channelCodes?.message}
              />
            </fieldset>
          </div>

          {recipientType === "SPECIFIC_USER" ||
          recipientType === "SPECIFIC_ROLE" ? (
            <div>
              <Label htmlFor="notification-recipient-target">
                {recipientType === "SPECIFIC_USER"
                  ? "Specific user"
                  : "Specific role"}
              </Label>
              <Select
                id="notification-recipient-target"
                {...form.register("targetId")}
              >
                <option value="">
                  Select{" "}
                  {recipientType === "SPECIFIC_USER" ? "a user" : "a role"}
                </option>
                {targetedOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <FieldError message={form.formState.errors.targetId?.message} />
            </div>
          ) : null}

          <div className="flex justify-end gap-3 border-t border-brand-navy/10 pt-5">
            <GeneralButton onClick={onClose} type="button" variant="outline">
              Cancel
            </GeneralButton>
            <GeneralButton type="submit">Save</GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
