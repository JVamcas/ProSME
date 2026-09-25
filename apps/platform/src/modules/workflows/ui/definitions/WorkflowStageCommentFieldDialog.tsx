"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageCommentField } from "@/modules/workflows/domain/definitions/WorkflowStageCommentField";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  commentFieldVisibilityItems,
  workflowStageCommentFieldFormSchema,
  type WorkflowStageCommentFieldFormValues,
} from "./WorkflowStageCommentFieldFormSchema";

type Props = {
  editor: WorkflowEditorView;
  field?: WorkflowStageCommentField;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export function WorkflowStageCommentFieldDialog({
  editor,
  field,
  onClose,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const form = useForm<WorkflowStageCommentFieldFormValues>({
    defaultValues: {
      displayOrder: field?.displayOrder
        ?? Math.max(0, ...(stage.commentFields ?? []).map((item) => item.displayOrder)) + 1,
      helpText: field?.helpText ?? "",
      key: field?.key ?? "",
      label: field?.label ?? "",
      taskStableKey: field?.taskStableKey ?? stage.tasks[0]?.stableKey ?? "",
      mandatory: field?.mandatory ?? false,
      visibility: field?.visibility ?? "INTERNAL_ONLY",
    },
    resolver: zodResolver(workflowStageCommentFieldFormSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    const duplicateKey = (stage.commentFields ?? []).some(
      (item) => item.key === values.key && item.key !== field?.key,
    );
    if (duplicateKey) {
      form.setError("key", {
        message: "Key must be unique in this stage.",
      });
      return;
    }
    const duplicateOrder = (stage.commentFields ?? []).some(
      (item) =>
        item.displayOrder === values.displayOrder && item.key !== field?.key,
    );
    if (duplicateOrder) {
      form.setError("displayOrder", {
        message: "Display order must be unique in this stage.",
      });
      return;
    }
    const nextField = {
      ...(field?.id ? { id: field.id } : {}),
      ...values,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              commentFields: field
                ? (item.commentFields ?? []).map((current) =>
                    current.key === field.key ? nextField : current,
                  )
                : [...(item.commentFields ?? []), nextField],
            }
          : item,
      ),
      transitions: editor.graph.transitions,
    });
    onClose();
  });

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      size="2xl"
      title={field ? "Edit comment or recommendation" : "Add comment or recommendation"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormSelect
            containerClassName="sm:col-span-2"
            items={stage.tasks.map((task) => ({
              label: task.name,
              value: task.stableKey,
            }))}
            label="Workflow task"
            name="taskStableKey"
            placeholder="Select a workflow task"
            required
          />
          <FormInput label="Key" name="key" placeholder="REVIEW_RECOMMENDATION" required />
          <FormInput
            label="Display order"
            min={1}
            name="displayOrder"
            registrationOptions={{ valueAsNumber: true }}
            required
            type="number"
          />
          <FormInput
            containerClassName="sm:col-span-2"
            label="Label"
            name="label"
            placeholder="Review recommendation"
            required
          />
          <FormTextarea
            containerClassName="sm:col-span-2"
            label="Help text"
            name="helpText"
            placeholder="Explain what the reviewer should provide."
            rows={3}
          />
          <FormSelect
            items={commentFieldVisibilityItems}
            label="Visibility"
            name="visibility"
            required
          />
          <CheckboxField label="Mandatory" name="mandatory" />
          {mutation.error ? (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save field"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
