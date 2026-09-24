"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowStageScoringCriterion } from "@/modules/workflows/domain/definitions/WorkflowStageScoringDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowStageScoringCriterionFormSchema,
  type WorkflowStageScoringCriterionFormValues,
} from "./WorkflowStageScoringFormSchema";

type Props = {
  criterion?: WorkflowStageScoringCriterion;
  editor: WorkflowEditorView;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export function WorkflowStageScoringCriterionDialog({
  criterion,
  editor,
  onClose,
  stage,
}: Props) {
  const mutation = useSaveWorkflowGraph(editor);
  const criteria = stage.scoring?.criteria ?? [];
  const form = useForm<WorkflowStageScoringCriterionFormValues>({
    defaultValues: {
      criterion: criterion?.criterion ?? "",
      description: criterion?.description ?? "",
      mandatoryComment: criterion?.mandatoryComment ?? false,
      scaleMaximum: criterion?.scaleMaximum ?? 10,
      scaleMinimum: criterion?.scaleMinimum ?? 0,
      threshold: criterion?.threshold ?? 5,
      weight: criterion?.weight ?? 1,
    },
    resolver: zodResolver(workflowStageScoringCriterionFormSchema),
  });

  const submit = form.handleSubmit(async (values) => {
    const duplicateName = criteria.some(
      (item) =>
        item.criterion.toLowerCase() === values.criterion.toLowerCase()
        && item.criterion !== criterion?.criterion,
    );
    if (duplicateName) {
      form.setError("criterion", {
        message: "Criterion must be unique in this stage.",
      });
      return;
    }
    const nextCriterion = {
      ...(criterion?.id ? { id: criterion.id } : {}),
      ...values,
    };
    await mutation.mutateAsync({
      stages: editor.graph.stages.map((item) =>
        item.stableKey === stage.stableKey
          ? {
              ...item,
              scoring: {
                aggregation: item.scoring?.aggregation ?? "WEIGHTED_AVERAGE",
                criteria: criterion
                  ? criteria.map((current) =>
                      current.criterion === criterion.criterion
                        ? nextCriterion
                        : current,
                    )
                  : [...criteria, nextCriterion],
              },
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
            label="Threshold"
            min={0}
            name="threshold"
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
