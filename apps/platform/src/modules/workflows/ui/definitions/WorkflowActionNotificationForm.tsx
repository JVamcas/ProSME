"use client";

import { z } from "zod";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { GeneralButton } from "@/shared/ui/Button";
import { DropdownButton } from "@/shared/ui/DropdownButton";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import { validateConditionGroup } from "@/modules/conditions/engine/ConditionValidation";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import {
  actionNotificationParameters,
  actionNotificationRecipientItems,
  workflowActionNotificationSchema,
  type WorkflowActionNotification,
} from "../../domain/actions/WorkflowActionNotification";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "../../domain/definitions/WorkflowTypes";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

type Props = {
  value?: WorkflowActionNotification;
  editor: WorkflowEditorView;
  stage: WorkflowStageInput;
  onClose: () => void;
  onSave: (value: WorkflowActionNotification) => void;
};

export function WorkflowActionNotificationForm({
  value,
  editor,
  stage,
  onClose,
  onSave,
}: Props) {
  const fields = useWorkflowConditionFields(editor, stage);
  const subjectSelection = useRef<{ start: number; end: number } | null>(null);
  const form = useForm<
    z.input<typeof workflowActionNotificationSchema>,
    unknown,
    WorkflowActionNotification
  >({
    resolver: zodResolver(workflowActionNotificationSchema),
    defaultValues: value ?? {
      id: crypto.randomUUID(),
      condition: null,
      recipientType: "APPLICATION_OWNER",
      recipientId: null,
      subject: "",
      body: "",
    },
  });
  const recipientType = useWatch({
    control: form.control,
    name: "recipientType",
  });
  const options = editor.assignmentOptions;
  const recipientItems =
    recipientType === "SPECIFIC_ROLE"
      ? (options?.roles.map((role) => ({
          value: role.id,
          label: role.label,
        })) ?? [])
      : (options?.users.map((user) => ({
          value: user.id,
          label: user.label,
        })) ?? []);
  const save = form.handleSubmit((values) => {
    if (values.condition) {
      const validation = validateConditionGroup(
        values.condition,
        fields.completionFields,
        conditionBuilderOperators,
      );
      if (fields.isPending || !validation.valid) {
        form.setError("condition", {
          message:
            validation.issues[0]?.message ??
            "Wait for condition fields to load.",
        });
        return;
      }
    }
    onSave(values);
  });

  return (
    <FormProvider {...form}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.stopPropagation();
          void save(event);
        }}
      >
        <Controller
          control={form.control}
          name="condition"
          render={({ field, fieldState }) => (
            <div>
              <WorkflowConditionEditor
                fields={fields.completionFields}
                isPending={fields.isPending}
                label="Notification condition"
                onChange={field.onChange}
                value={field.value as ConditionGroup | null}
              />
              {fieldState.error ? (
                <p role="alert" className="text-sm text-red-700">
                  {fieldState.error.message}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-brand-navy/60">
                Without a condition, this notification always sends on this
                action.
              </p>
            </div>
          )}
        />
        <FormSelect
          name="recipientType"
          label="Recipient"
          items={[...actionNotificationRecipientItems]}
          onChange={(event) => {
            form.setValue(
              "recipientType",
              event.target.value as WorkflowActionNotification["recipientType"],
              { shouldDirty: true },
            );
            form.setValue("recipientId", null, { shouldDirty: true });
          }}
          required
        />
        {recipientType === "SPECIFIC_USER" ||
        recipientType === "SPECIFIC_ROLE" ? (
          <FormSelect
            name="recipientId"
            label={recipientType === "SPECIFIC_ROLE" ? "Role" : "User"}
            items={recipientItems}
            placeholder="Select a recipient"
            required
          />
        ) : null}
        <FormInput
          autoFocus
          name="subject"
          label="Subject"
          required
          onSelect={(event) => {
            const input = event.currentTarget;
            subjectSelection.current = {
              start: input.selectionStart ?? 0,
              end: input.selectionEnd ?? 0,
            };
          }}
          labelAccessory={
            <DropdownButton
              label="Insert subject parameter"
              items={actionNotificationParameters.map((parameter) => ({
                id: parameter.value,
                label: parameter.label,
                onAction: () => {
                  const subject = form.getValues("subject");
                  const selection = subjectSelection.current ?? {
                    start: subject.length,
                    end: subject.length,
                  };
                  const token = `{{${parameter.value}}}`;
                  form.setValue(
                    "subject",
                    subject.slice(0, selection.start) +
                      token +
                      subject.slice(selection.end),
                    { shouldDirty: true, shouldValidate: true },
                  );
                  subjectSelection.current = {
                    start: selection.start + token.length,
                    end: selection.start + token.length,
                  };
                },
              }))}
            />
          }
        />
        <FormRichTextField
          name="body"
          label="Body"
          parameters={actionNotificationParameters}
          required
        />
        <div className="flex justify-end gap-2 border-t border-brand-navy/10 pt-4">
          <GeneralButton onClick={onClose} type="button" variant="outline">
            Cancel
          </GeneralButton>
          <GeneralButton type="submit">Save notification</GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}
