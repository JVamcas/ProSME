"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageChecklistDefinition } from "@/modules/workflows/domain/definitions/WorkflowStageChecklistDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  checklistEvidenceRequirementItems,
  checklistResponseTypeItems,
  workflowStageChecklistFormSchema,
  type WorkflowStageChecklistFormValues,
} from "./WorkflowStageChecklistFormSchema";

type Props = {
  checklistItem?: WorkflowStageChecklistDefinition;
  editor: WorkflowEditorView;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export function WorkflowStageChecklistDialog({
  checklistItem,
  editor,
  onClose,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const checklistItems = stage.checklistItems;
  const form = useForm<WorkflowStageChecklistFormValues>({
    defaultValues: {
      displayOrder: checklistItem?.displayOrder
        ?? Math.max(0, ...checklistItems.map((item) => item.displayOrder)) + 1,
      evidenceRequirement:
        checklistItem?.evidenceRequirement ?? "NONE",
      key: checklistItem?.key ?? "",
      mandatory: checklistItem?.mandatory ?? true,
      notes: checklistItem?.notes ?? "",
      responseType: checklistItem?.responseType ?? "YES_NO",
      taskStableKey: checklistItem?.taskStableKey ?? "",
      text: checklistItem?.text ?? "",
    },
    resolver: zodResolver(workflowStageChecklistFormSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    const duplicateKey = checklistItems.some(
      (item) => item.key === values.key && item.key !== checklistItem?.key,
    );
    if (duplicateKey) {
      form.setError("key", {
        message: "Checklist key must be unique in this stage.",
      });
      return;
    }
    const duplicateOrder = checklistItems.some(
      (item) =>
        item.displayOrder === values.displayOrder
        && item.key !== checklistItem?.key,
    );
    if (duplicateOrder) {
      form.setError("displayOrder", {
        message: "Display order must be unique in this stage.",
      });
      return;
    }
    const nextItem = {
      ...(checklistItem?.id ? { id: checklistItem.id } : {}),
      ...values,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              checklistItems: checklistItem
                ? checklistItems.map((current) =>
                    current.key === checklistItem.key ? nextItem : current,
                  )
                : [...checklistItems, nextItem],
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
      title={checklistItem ? "Edit checklist item" : "Add checklist item"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormInput
            label="Key"
            name="key"
            placeholder="OWNERSHIP_CONFIRMED"
            required
          />
          <FormInput
            label="Display order"
            min={1}
            name="displayOrder"
            registrationOptions={{ valueAsNumber: true }}
            required
            type="number"
          />
          <FormSelect
            items={stage.tasks.map((task) => ({
              label: task.name,
              value: task.stableKey,
            }))}
            label="Workflow task"
            name="taskStableKey"
            placeholder={stage.tasks.length
              ? "Select a task"
              : "Add a task to this stage first"}
            required
          />
          <FormSelect
            items={checklistResponseTypeItems}
            label="Response type"
            name="responseType"
            required
          />
          <FormSelect
            items={checklistEvidenceRequirementItems}
            label="Evidence requirement"
            name="evidenceRequirement"
            required
          />
          <FormTextarea
            containerClassName="sm:col-span-2"
            label="Notes"
            name="notes"
            placeholder="Add guidance for the reviewer."
            rows={2}
          />
          <FormTextarea
            containerClassName="sm:col-span-2"
            label="Checklist text"
            name="text"
            placeholder="Confirm that the ownership requirement is met."
            required
            rows={2}
          />
          
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Is Mandatory"
            name="mandatory"
          />
          {mutation.error ? (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save checklist item"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
