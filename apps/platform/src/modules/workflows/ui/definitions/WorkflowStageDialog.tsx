"use client";

import { useState } from "react";
import { FormProvider, type FieldErrors } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StepProgress } from "@/components/ui/step-progress";
import { getErrorMessages } from "@/lib/client-http";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageBehaviourStep } from "./WorkflowStageBehaviourStep";
import { WorkflowStageDetailsStep } from "./WorkflowStageDetailsStep";
import { useWorkflowStageDialogController } from "./WorkflowStageDialogController";
import {
  type WorkflowStageEditorStep,
  workflowStageEditorStepFields,
  workflowStageEditorSteps,
} from "./WorkflowStageEditorSteps";
import { WorkflowStageEntryStep } from "./WorkflowStageEntryStep";
import { WorkflowStageExitStep } from "./WorkflowStageExitStep";
import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";
import { WorkflowStageReviewStep } from "./WorkflowStageReviewStep";

type Props = {
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (code: string) => void;
  stage?: WorkflowStageInput;
};

export function WorkflowStageDialog({
  editor,
  isOpen,
  onClose,
  onCreated,
  stage,
}: Props) {
  const controller = useWorkflowStageDialogController(editor, stage);
  const [currentStep, setCurrentStep] =
    useState<WorkflowStageEditorStep>("details");
  const [completedSteps, setCompletedSteps] = useState<
    WorkflowStageEditorStep[]
  >([]);
  const currentIndex = workflowStageEditorSteps.findIndex(
    (step) => step.id === currentStep,
  );

  async function continueToNextStep() {
    const valid = await controller.validateStep(currentStep);
    if (!valid || currentIndex === workflowStageEditorSteps.length - 1) return;
    setCompletedSteps((steps) =>
      steps.includes(currentStep) ? steps : [...steps, currentStep],
    );
    setCurrentStep(workflowStageEditorSteps[currentIndex + 1].id);
  }

  async function changeStep(step: WorkflowStageEditorStep, index: number) {
    if (index <= currentIndex || completedSteps.includes(step)) {
      setCurrentStep(step);
      return;
    }
    if (index === currentIndex + 1) await continueToNextStep();
  }

  function showFirstErrorStep(errors?: FieldErrors<WorkflowStageFormInput>) {
    const step = workflowStageEditorSteps.find((item) =>
      workflowStageEditorStepFields[item.id].some(
        (field) => errors?.[field] ?? controller.form.getFieldState(field).error,
      ),
    );
    if (step) setCurrentStep(step.id);
  }

  const submit = controller.form.handleSubmit(
    async (values) => {
      const stableKey = await controller.save(values);
      onCreated(stableKey);
      onClose();
    },
    showFirstErrorStep,
  );

  function renderStep() {
    if (currentStep === "details") return <WorkflowStageDetailsStep />;
    if (currentStep === "behaviour") {
      return (
        <WorkflowStageBehaviourStep
          coiFormItems={controller.coiFormItems}
          coiGated={controller.coiGated}
          formsPending={controller.forms.isPending}
        />
      );
    }
    if (currentStep === "entry") {
      return (
        <WorkflowStageEntryStep
          conditionFields={controller.conditionFields.entryFields}
          isPending={controller.conditionFields.isPending}
          predecessorItems={controller.predecessorItems}
        />
      );
    }
    if (currentStep === "exit") {
      return (
        <WorkflowStageExitStep
          conditionFields={controller.conditionFields.completionFields}
          isPending={controller.conditionFields.isPending}
        />
      );
    }
    return (
      <WorkflowStageReviewStep
        coiFormItems={controller.coiFormItems}
        stages={editor.graph.stages}
      />
    );
  }

  const mutationErrors = getErrorMessages(controller.mutation.error);

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={stage ? "Edit workflow stage" : "Add workflow stage"}
    >
      <FormProvider {...controller.form}>
        <form onSubmit={submit}>
          <StepProgress
            ariaLabel="Workflow stage configuration"
            className="border-b border-brand-navy/10 pb-5"
            completedStepIds={completedSteps}
            currentStepId={currentStep}
            disabled={controller.mutation.isPending}
            hideLabelsOnMobile
            onStepChange={changeStep}
            steps={workflowStageEditorSteps.map((step, index) => ({
              ...step,
              disabled:
                index > currentIndex + 1 && !completedSteps.includes(step.id),
            }))}
          />
          <div className="min-h-80 py-6">{renderStep()}</div>
          {mutationErrors.length ? (
            <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-red-700" role="alert">
              {mutationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center justify-between border-t border-brand-navy/10 pt-4">
            <GeneralButton
              disabled={currentIndex === 0 || controller.mutation.isPending}
              onClick={() =>
                setCurrentStep(workflowStageEditorSteps[currentIndex - 1].id)
              }
              type="button"
              variant="outline"
            >
              Back
            </GeneralButton>
            {currentStep === "review" ? (
              <GeneralButton
                disabled={controller.mutation.isPending}
                type="submit"
              >
                {controller.mutation.isPending
                  ? "Saving…"
                  : stage
                    ? "Save stage"
                    : "Add stage"}
              </GeneralButton>
            ) : (
              <GeneralButton
                disabled={controller.mutation.isPending}
                onClick={() => void continueToNextStep()}
                type="button"
              >
                Continue
              </GeneralButton>
            )}
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}
