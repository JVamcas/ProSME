"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import {
  type WorkflowActionFormValues,
  workflowActionFormSchema,
  workflowActionTypeItems,
} from "./WorkflowActionFormSchema";

type Props = {
  action?: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export function WorkflowActionDialog({
  action,
  editor,
  isOpen,
  onClose,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const form = useForm<WorkflowActionFormValues>({
    defaultValues: {
      stableKey: action?.stableKey ?? "",
      label: action?.label ?? "",
      actionType: action?.actionType ?? "APPROVE_ADVANCE",
      enabled: action?.enabled ?? true,
      reasonCodeRequired: action?.reasonCodeRequired ?? false,
      displayOrder: action?.displayOrder ?? stage.actions.length + 1,
    },
    resolver: zodResolver(workflowActionFormSchema),
  });
  const submit = form.handleSubmit(async (values) => {
    const duplicateKey = stage.actions.some(
      (item) =>
        item.stableKey === values.stableKey &&
        item.stableKey !== action?.stableKey,
    );
    if (duplicateKey) {
      form.setError("stableKey", {
        message: "Action key must be unique in this stage.",
      });
      return;
    }
    const duplicateOrder = stage.actions.some(
      (item) =>
        item.displayOrder === values.displayOrder &&
        item.stableKey !== action?.stableKey,
    );
    if (duplicateOrder) {
      form.setError("displayOrder", {
        message: "Display order must be unique in this stage.",
      });
      return;
    }
    const nextAction: WorkflowActionDefinition = {
      ...(action?.id ? { id: action.id } : {}),
      ...values,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              actions: action
                ? item.actions.map((current) =>
                    current.stableKey === action.stableKey
                      ? nextAction
                      : current,
                  )
                : [...item.actions, nextAction],
            }
          : item,
      ),
      transitions: editor.graph.transitions,
    });
    onClose();
  });

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={action ? "Edit workflow action" : "Add workflow action"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormInput
            label="Stable key"
            name="stableKey"
            placeholder="APPROVE_REVIEW"
            required
          />
          <FormInput
            label="Button label"
            name="label"
            placeholder="Approve review"
            required
          />
          <FormSelect
            items={workflowActionTypeItems}
            label="Action type"
            name="actionType"
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
          <CheckboxField label="Enabled" name="enabled" />
          <CheckboxField
            label="Require a reason code"
            name="reasonCodeRequired"
          />
          {mutation.error ? (
            <p className="sm:col-span-2 text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save action"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
