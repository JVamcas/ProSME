"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { useEffect, useRef } from "react";

import { GeneralButton } from "@/components/ui/button";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import {
  toWorkflowTransition,
  type WorkflowTransitionFormValues,
  workflowTransitionFormDefaults,
  workflowTransitionFormSchema,
} from "./WorkflowTransitionFormSchema";
import { WorkflowConditionEditor } from "./WorkflowConditionEditor";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

import {
  standardTerminalOutcomes,
  terminalOutcomeLabel,
  terminalOutcomeApplicantStatus,
} from "../../domain/transitions/WorkflowTerminalOutcome";

type TargetType = "STAGE" | "TERMINAL";

type Props = {
  actionKey: string;
  editor: WorkflowEditorView;
  onCancel: () => void;
  onSave: (route: WorkflowTransitionDefinition) => void;
  priority: number;
  priorityInUse: (priority: number) => boolean;
  route?: WorkflowTransitionDefinition;
  stage: WorkflowStageInput;
  targetTypeConstraint?: TargetType;
};

function nextEnabledStageKey(
  stages: WorkflowStageInput[],
  currentStage: WorkflowStageInput,
) {
  return (
    stages
      .filter(
        (candidate) =>
          candidate.enabled &&
          candidate.displayOrder > currentStage.displayOrder,
      )
      .sort((left, right) => left.displayOrder - right.displayOrder)[0]
      ?.stableKey ?? ""
  );
}

export function WorkflowActionRouteEditor({
  actionKey,
  editor,
  onCancel,
  onSave,
  priority,
  priorityInUse,
  route,
  stage,
  targetTypeConstraint,
}: Props) {
  const conditionFields = useWorkflowConditionFields(editor, stage);
  const defaults = workflowTransitionFormDefaults(
    route,
    actionKey,
    nextEnabledStageKey(editor.graph.stages, stage),
    priority,
  );
  const form = useForm<
    z.input<typeof workflowTransitionFormSchema>,
    unknown,
    WorkflowTransitionFormValues
  >({
    defaultValues: {
      ...defaults,
      targetType: route?.terminalOutcome
        ? "TERMINAL"
        : (targetTypeConstraint ?? defaults.targetType),
    },
    resolver: zodResolver(workflowTransitionFormSchema),
  });
  const terminalOutcome = useWatch({
    control: form.control,
    name: "terminalOutcome",
  });
  const previousOutcome = useRef(terminalOutcome);
  useEffect(() => {
    if (previousOutcome.current === terminalOutcome) return;
    previousOutcome.current = terminalOutcome;
    const mapping = terminalOutcomeApplicantStatus(terminalOutcome);
    form.setValue("terminalApplicantLabel", mapping.label, {
      shouldDirty: true,
      shouldValidate: true,
    });
    form.setValue("terminalApplicantDescription", mapping.description, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [form, terminalOutcome]);
  const targetType = useWatch({ control: form.control, name: "targetType" });
  const targetStageKeys = useWatch({
    control: form.control,
    name: "targetStageKeys",
  });
  const terminalOutcomeItems = [
    ...new Set([
      ...standardTerminalOutcomes,
      ...editor.graph.transitions
        .map((transition) => transition.terminalOutcome)
        .filter((outcome): outcome is string => Boolean(outcome)),
    ]),
  ].map((code) => ({ label: terminalOutcomeLabel(code), value: code }));

  const save = form.handleSubmit((values) => {
    if (priorityInUse(values.priority)) {
      form.setError("priority", {
        message: "Priority must be unique for this action.",
      });
      return;
    }
    onSave(toWorkflowTransition(values, stage.stableKey, route?.id));
  });
  const destinationTypes = [
    { label: "Workflow stage", value: "STAGE" },
    { label: "Terminal outcome", value: "TERMINAL" },
  ].filter(
    (item) => !targetTypeConstraint || item.value === targetTypeConstraint,
  );

  return (
    <FormProvider {...form}>
      <section className="grid gap-4 rounded-xl border border-brand-orange/40 bg-brand-orange/[0.04] p-4 sm:grid-cols-2">
        <h4 className="font-bold text-brand-navy sm:col-span-2">
          {route ? "Edit route" : "Add route"}
        </h4>
        <FormInput
          label="Priority"
          min={1}
          name="priority"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
        <FormSelect
          disabled={Boolean(targetTypeConstraint)}
          items={destinationTypes}
          label="Destination type"
          name="targetType"
          required
        />
        {targetType === "STAGE" ? (
          <FormSelect
            containerClassName="sm:col-span-2"
            items={editor.graph.stages.map((item) => ({
              label: item.name,
              value: item.stableKey,
            }))}
            label="Target stages"
            multiple
            name="targetStageKeys"
            onMultipleChange={(values) =>
              form.setValue("targetStageKeys", values, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            placeholder="Select one or more stages"
            required
            value={targetStageKeys}
          />
        ) : (
          <FormSelect
            containerClassName="sm:col-span-2"
            items={terminalOutcomeItems}
            label="Terminal outcome"
            name="terminalOutcome"
            placeholder="Select an outcome"
            required
          />
        )}
        {targetType === "TERMINAL" ? (
          <>
            <FormInput
              containerClassName="sm:col-span-2"
              label="Applicant status label"
              name="terminalApplicantLabel"
              required
            />
            <FormTextarea
              containerClassName="sm:col-span-2"
              label="Applicant status description"
              name="terminalApplicantDescription"
              required
              rows={3}
            />
          </>
        ) : null}
        <div className="sm:col-span-2">
          <Controller
            control={form.control}
            name="condition"
            render={({ field }) => (
              <WorkflowConditionEditor
                fields={conditionFields.completionFields}
                isPending={conditionFields.isPending}
                label="Route condition"
                onChange={field.onChange}
                value={field.value as ConditionGroup | null}
              />
            )}
          />
        </div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <GeneralButton onClick={onCancel} type="button" variant="outline">
            Cancel
          </GeneralButton>
          <GeneralButton onClick={() => void save()} type="button">
            Save route
          </GeneralButton>
        </div>
      </section>
    </FormProvider>
  );
}
