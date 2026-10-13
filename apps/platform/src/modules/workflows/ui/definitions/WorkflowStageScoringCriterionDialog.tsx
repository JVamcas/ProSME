"use client";

import { generateWorkflowStableKey } from "../../domain/WorkflowStableKey";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowTaskScoringCriterion } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowStageScoringCriterionFormSchema,
  type WorkflowStageScoringCriterionFormValues,
} from "./WorkflowStageScoringFormSchema";

type Props = {
  criterion?: WorkflowTaskScoringCriterion;
  editor: WorkflowEditorView;
  onClose: () => void;
  stage: WorkflowStageInput;
  taskStableKey: string;
};

export function WorkflowStageScoringCriterionDialog({
  criterion,
  editor,
  onClose,
  stage,
  taskStableKey,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const scoring = stage.scoring?.find(
    (configuration) => configuration.taskStableKey === taskStableKey,
  );
  const criteria = scoring?.criteria ?? [];
  const form = useForm<WorkflowStageScoringCriterionFormValues>({
    defaultValues: {
      criterion: criterion?.criterion ?? "",
      description: criterion?.description ?? "",
      mandatoryComment: criterion?.mandatoryComment ?? false,
      scaleMaximum: criterion?.scaleMaximum ?? 10,
      scaleMinimum: criterion?.scaleMinimum ?? 0,
      weight: criterion?.weight ?? 1,
    },
    resolver: zodResolver(workflowStageScoringCriterionFormSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    const stableKey = criterion?.stableKey ?? generateWorkflowStableKey();
    const duplicateKey = criteria.some(
      (item) =>
        item.stableKey === stableKey && item.stableKey !== criterion?.stableKey,
    );
    if (duplicateKey) {
      form.setError("criterion", {
        message:
          "This scoring criterion conflicts with an existing item in the selected task.",
      });
      return;
    }
    const duplicateName = criteria.some(
      (item) =>
        item.criterion.toLowerCase() === values.criterion.toLowerCase() &&
        item.criterion !== criterion?.criterion,
    );
    if (duplicateName) {
      form.setError("criterion", {
        message: "Criterion must be unique in this task.",
      });
      return;
    }
    const nextCriterion = {
      ...(criterion?.id ? { id: criterion.id } : {}),
      ...values,
      stableKey,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) => {
        if (item.stableKey !== stage.stableKey) return item;
        const configurations = item.scoring ?? [];
        const nextScoring = {
          aggregation: scoring?.aggregation ?? ("WEIGHTED_AVERAGE" as const),
          criteria: criterion
            ? criteria.map((current) =>
                current.stableKey === criterion.stableKey
                  ? nextCriterion
                  : current,
              )
            : [...criteria, nextCriterion],
          taskStableKey,
        };
        return {
          ...item,
          scoring: scoring
            ? configurations.map((configuration) =>
                configuration.taskStableKey === taskStableKey
                  ? nextScoring
                  : configuration,
              )
            : [...configurations, nextScoring],
        };
      }),
      transitions: editor.graph.transitions,
    });
    onClose();
  });

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      size="2xl"
      title={criterion ? "Edit scoring criterion" : "Add scoring criterion"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <FormInput
            containerClassName="sm:col-span-2"
            label="Criterion"
            name="criterion"
            placeholder="Business viability"
            required
          />
          <FormTextarea
            containerClassName="sm:col-span-2"
            label="Description"
            name="description"
            placeholder="Describe how reviewers should assess this criterion."
            rows={3}
          />
          <FormInput
            containerClassName="sm:col-span-2"
            label="Weight"
            max={100}
            min={0.01}
            name="weight"
            registrationOptions={{ valueAsNumber: true }}
            required
            step="any"
            type="number"
          />
          <FormInput
            label="Scale minimum"
            min={0}
            name="scaleMinimum"
            registrationOptions={{ valueAsNumber: true }}
            required
            step="any"
            type="number"
          />
          <FormInput
            label="Scale maximum"
            max={1000}
            min={0.01}
            name="scaleMaximum"
            registrationOptions={{ valueAsNumber: true }}
            required
            step="any"
            type="number"
          />
          <CheckboxField
            containerClassName="sm:col-span-2"
            label="Require a reviewer comment"
            name="mandatoryComment"
          />
          {mutation.error ? (
            <p className="text-sm text-red-700 sm:col-span-2" role="alert">
              {mutation.error.message}
            </p>
          ) : null}
          <div className="flex justify-end sm:col-span-2">
            <GeneralButton disabled={mutation.isPending} type="submit">
              {mutation.isPending ? "Saving…" : "Save scoring criterion"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
