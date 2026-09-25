"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import {
  toWorkflowTransition,
  type WorkflowTransitionFormValues,
  workflowTransitionFormDefaults,
  workflowTransitionFormSchema,
} from "./WorkflowTransitionFormSchema";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

const standardTerminalOutcomes = [
  "APPROVED",
  "AWARD_LAPSED",
  "CLOSED",
  "CLOSED_QUALIFIED",
  "CLOSED_UNSUCCESSFUL",
  "COMPLETED",
  "DECLINED_COMMITTEE",
  "DECLINED_RISK",
  "DEFERRED",
  "INELIGIBLE",
  "RECOVERY",
  "REFERRED_RECOVERY_INVESTIGATION",
  "REJECTED",
  "REJECTED_INCOMPLETE",
  "RESERVE_LIST",
  "RESERVE_REALLOCATION",
  "RESTRICTED",
  "TERMINATED_RECOVERY",
  "UNSUCCESSFUL",
  "WITHDRAWN",
] as const;

function terminalOutcomeLabel(code: string) {
  const words = code.replaceAll("_", " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

type Props = {
  editor: WorkflowEditorView;
  onClose: () => void;
  stage: WorkflowStageInput;
  transition?: WorkflowTransitionDefinition;
};

function nextEnabledStageKey(
  stages: WorkflowStageInput[],
  currentStage: WorkflowStageInput,
) {
  return stages
    .filter(
      (candidate) =>
        candidate.enabled &&
        candidate.displayOrder > currentStage.displayOrder,
    )
    .sort((left, right) => left.displayOrder - right.displayOrder)[0]
    ?.stableKey ?? "";
}

export function WorkflowTransitionDialog({
  editor,
  onClose,
  stage,
  transition,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const conditionFields = useWorkflowConditionFields(editor, stage);
  const sourceTransitions = editor.graph.transitions.filter(
    (item) => item.sourceStageKey === stage.stableKey,
  );
  const terminalOutcomeItems = [
    ...new Set([
      ...standardTerminalOutcomes,
      ...editor.graph.transitions
        .map((item) => item.terminalOutcome)
        .filter((outcome): outcome is string => Boolean(outcome)),
    ]),
  ].map((code) => ({ label: terminalOutcomeLabel(code), value: code }));
  const defaultActionKey = stage.actions[0]?.stableKey ?? "";
  const defaultPriority = Math.max(
    0,
    ...sourceTransitions
      .filter((item) => item.actionKey === defaultActionKey)
      .map((item) => item.priority),
  ) + 1;
  const form = useForm<
    z.input<typeof workflowTransitionFormSchema>,
    unknown,
    WorkflowTransitionFormValues
  >({
    defaultValues: workflowTransitionFormDefaults(
      transition,
      defaultActionKey,
      nextEnabledStageKey(editor.graph.stages, stage),
      defaultPriority,
    ),
    resolver: zodResolver(workflowTransitionFormSchema),
  });
  const targetType = useWatch({ control: form.control, name: "targetType" });

  const submit = form.handleSubmit(async (values) => {
    const duplicatePriority = sourceTransitions.some(
      (item) =>
        item.id !== transition?.id &&
        item.actionKey === values.actionKey &&
        item.priority === values.priority,
    );
    if (duplicatePriority) {
      form.setError("priority", {
        message: "Priority must be unique for the selected action.",
      });
      return;
    }
    const nextTransition = toWorkflowTransition(
      values,
      stage.stableKey,
      transition?.id,
    );
    await mutation.mutateAsync({
      stages: editor.graph.stages,
      transitions: transition
        ? editor.graph.transitions.map((item) =>
            item.id === transition.id ? nextTransition : item,
          )
        : [...editor.graph.transitions, nextTransition],
    });
    onClose();
  });

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      title={transition ? "Edit transition" : "Add transition"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormSelect
            items={stage.actions.map((action) => ({
              label: action.label,
              value: action.stableKey,
            }))}
            label="Action"
            name="actionKey"
            placeholder="Select an action"
            required
          />
          <FormInput
            label="Priority"
            min={1}
            name="priority"
            registrationOptions={{ valueAsNumber: true }}
            required
            type="number"
          />
          <FormSelect
            items={[
              { label: "Workflow stage", value: "STAGE" },
              { label: "Terminal outcome", value: "TERMINAL" },
            ]}
            label="Destination type"
            name="targetType"
            required
          />
          {targetType === "STAGE" ? (
            <FormSelect
              items={editor.graph.stages.map((item) => ({
                label: item.name,
                value: item.stableKey,
              }))}
              label="Target stage"
              name="targetStageKey"
              placeholder="Select a stage"
              required
            />
          ) : (
            <FormSelect
              items={terminalOutcomeItems}
              label="Terminal outcome"
              name="terminalOutcome"
              placeholder="Select an outcome"
              required
            />
          )}
          <div className="sm:col-span-2">
            <Controller
              control={form.control}
              name="condition"
              render={({ field }) => (
                <WorkflowConditionEditor
                  fields={conditionFields.completionFields}
                  isPending={conditionFields.isPending}
                  label="Transition condition"
                  onChange={field.onChange}
                  value={field.value as ConditionGroup | null}
                />
              )}
            />
          </div>
          {mutation.error ? (
            <p className="sm:col-span-2 text-sm text-red-700" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save transition"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
