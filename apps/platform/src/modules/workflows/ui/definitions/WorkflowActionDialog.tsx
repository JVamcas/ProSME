"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

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
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "./WorkflowActionFormMapping";
import { WorkflowActionConfigurationFields } from "./WorkflowActionConfigurationFields";

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
    defaultValues: workflowActionFormDefaults(
      action,
      stage.actions.length + 1,
    ),
    resolver: zodResolver(workflowActionFormSchema),
  });
  const actionType = useWatch({ control: form.control, name: "actionType" });
  const deferTargetType = useWatch({
    control: form.control,
    name: "deferTargetType",
  });
  const escalationTargetType = useWatch({
    control: form.control,
    name: "escalationTargetType",
  });
  const previousEscalationTargetType = useRef(escalationTargetType);

  useEffect(() => {
    if (previousEscalationTargetType.current === escalationTargetType) return;
    previousEscalationTargetType.current = escalationTargetType;
    form.setValue("escalationTargetId", "", { shouldValidate: true });
  }, [escalationTargetType, form]);

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
    const nextAction = toWorkflowActionDefinition(values, action?.id);
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
      transitions: action
        ? editor.graph.transitions.map((transition) => ({
            ...transition,
            actionKey:
              transition.sourceStageKey === stage.stableKey &&
              transition.actionKey === action.stableKey
                ? nextAction.stableKey
                : transition.actionKey,
          }))
        : editor.graph.transitions,
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
          <div className="sm:col-span-2 border-t border-brand-navy/10 pt-4">
            <h3 className="text-sm font-bold text-brand-navy">
              Action-specific configuration
            </h3>
          </div>
          <WorkflowActionConfigurationFields
            actionType={actionType}
            assignmentOptions={
              editor.assignmentOptions ?? { roles: [], users: [] }
            }
            deferTargetType={deferTargetType}
            escalationTargetType={escalationTargetType}
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
