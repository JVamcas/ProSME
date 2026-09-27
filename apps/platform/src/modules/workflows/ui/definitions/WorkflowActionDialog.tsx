"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import {
  isWorkflowStageDecisionAction,
  type WorkflowActionDefinition,
} from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { reconcileWorkflowActionBindings } from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { WorkflowActionConfigurationFields } from "./WorkflowActionConfigurationFields";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "./WorkflowActionFormMapping";
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
  const assignedTaskKeys = action
    ? stage.tasks
        .filter((task) => task.actionKeys.includes(action.stableKey))
        .map((task) => task.stableKey)
    : stage.tasks.map((task) => task.stableKey);
  const form = useForm<WorkflowActionFormValues>({
    defaultValues: workflowActionFormDefaults(
      action,
      stage.actions.length + 1,
      assignedTaskKeys,
    ),
    resolver: zodResolver(workflowActionFormSchema),
  });
  const actionType = useWatch({ control: form.control, name: "actionType" });
  const taskStableKeys = useWatch({
    control: form.control,
    name: "taskStableKeys",
  });
  const deferTargetType = useWatch({
    control: form.control,
    name: "deferTargetType",
  });
  const escalationTargetType = useWatch({
    control: form.control,
    name: "escalationTargetType",
  });
  const rejectionOutcomeType = useWatch({
    control: form.control,
    name: "rejectionOutcomeType",
  });
  const previousActionType = useRef(actionType);
  const previousEscalationTargetType = useRef(escalationTargetType);
  const decisionTask = stage.tasks.find(
    (task) => task.taskType === "STAGE_DECISION",
  );
  const isDecisionAction = isWorkflowStageDecisionAction(actionType);

  useEffect(() => {
    if (previousActionType.current === actionType) return;
    previousActionType.current = actionType;
    form.setValue(
      "taskStableKeys",
      isDecisionAction
        ? decisionTask
          ? [decisionTask.stableKey]
          : []
        : stage.tasks.map((task) => task.stableKey),
      { shouldDirty: true, shouldValidate: true },
    );
  }, [actionType, decisionTask, form, isDecisionAction, stage.tasks]);

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
    const nextAction = toWorkflowActionDefinition(
      values,
      action?.id,
      action?.condition,
    );
    const selectedTasks = new Set(values.taskStableKeys);
    const nextGraph = {
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
              tasks: item.tasks.map((task) => {
                const previousKey = action?.stableKey;
                const actionKeys = task.actionKeys.filter(
                  (key) => key !== previousKey && key !== nextAction.stableKey,
                );
                return {
                  ...task,
                  actionKeys: selectedTasks.has(task.stableKey)
                    ? [...actionKeys, nextAction.stableKey]
                    : actionKeys,
                };
              }),
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
    };
    await mutation.mutateAsync(
      reconcileWorkflowActionBindings(editor.graph, nextGraph),
    );
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
          {isDecisionAction ? (
            <div className="sm:col-span-2">
              <p className="text-sm font-medium text-brand-navy">
                Workflow task
              </p>
              <p className="mt-2 rounded-xl border border-brand-navy/10 bg-brand-navy/[0.03] px-4 py-3 text-sm text-brand-navy/70">
                {decisionTask
                  ? `Automatically assigned to ${decisionTask.name}.`
                  : "Add the stage-decision task to assign this action automatically."}
              </p>
            </div>
          ) : (
            <FormSelect
              containerClassName="sm:col-span-2"
              disabled={!action}
              infoTooltip={
                action
                  ? "Select every task in which this common action should appear."
                  : "New common actions are assigned to all tasks when first saved. Edit the action afterward to remove it from individual tasks."
              }
              items={stage.tasks.map((task) => ({
                label: task.name,
                value: task.stableKey,
              }))}
              label="Available on tasks"
              multiple
              name="taskStableKeys"
              onMultipleChange={(values) =>
                form.setValue("taskStableKeys", values, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder={
                stage.tasks.length
                  ? "Select tasks"
                  : "Common actions will be added when tasks are created"
              }
              value={taskStableKeys}
            />
          )}
          <CheckboxField label="Enabled" name="enabled" />
          {actionType !== "REJECT" ? (
            <CheckboxField
              label="Require a reason code"
              name="reasonCodeRequired"
            />
          ) : null}
          <WorkflowActionConfigurationFields
            actionType={actionType}
            assignmentOptions={
              editor.assignmentOptions ?? { roles: [], users: [] }
            }
            deferTargetType={deferTargetType}
            escalationTargetType={escalationTargetType}
            rejectionOutcomeType={rejectionOutcomeType}
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
