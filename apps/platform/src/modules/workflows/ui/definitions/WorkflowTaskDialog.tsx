"use client";

import { useState } from "react";
import { FormProvider, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StepProgress } from "@/components/ui/step-progress";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowTaskAssignmentStep } from "./WorkflowTaskAssignmentStep";
import { WorkflowTaskDetailsStep } from "./WorkflowTaskDetailsStep";
import { useWorkflowTaskDialogController } from "./WorkflowTaskDialogController";
import {
  type WorkflowTaskEditorStep,
  workflowTaskEditorStepFields,
  workflowTaskEditorSteps,
} from "./WorkflowTaskEditorSteps";
import { WorkflowTaskFormLayoutStep } from "./WorkflowTaskFormLayoutStep";
import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

type Props = {
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
  task?: WorkflowTaskInput;
};

export function WorkflowTaskDialog({
  editor,
  isOpen,
  onClose,
  stage,
  task,
}: Props) {
  const controller = useWorkflowTaskDialogController(editor, stage, task);
  const [currentStep, setCurrentStep] =
    useState<WorkflowTaskEditorStep>("details");
  const [completedSteps, setCompletedSteps] = useState<
    WorkflowTaskEditorStep[]
  >([]);
  const currentIndex = workflowTaskEditorSteps.findIndex(
    (step) => step.id === currentStep,
  );

  async function continueToNextStep() {
    const valid = await controller.validateStep(currentStep);
    if (!valid || currentIndex === workflowTaskEditorSteps.length - 1) return;
    setCompletedSteps((steps) =>
      steps.includes(currentStep) ? steps : [...steps, currentStep],
    );
    setCurrentStep(workflowTaskEditorSteps[currentIndex + 1].id);
  }

  async function changeStep(step: WorkflowTaskEditorStep, index: number) {
    if (index <= currentIndex || completedSteps.includes(step)) {
      setCurrentStep(step);
      return;
    }
    if (index === currentIndex + 1) await continueToNextStep();
  }

  function showFirstErrorStep(errors?: FieldErrors<WorkflowTaskFormValues>) {
    const step = workflowTaskEditorSteps.find((item) =>
      workflowTaskEditorStepFields[item.id].some(
        (field) => errors?.[field] ?? controller.form.getFieldState(field).error,
      ),
    );
    if (step) setCurrentStep(step.id);
  }

  const submit = controller.form.handleSubmit(
    async (values) => {
      try {
        const saved = await controller.save(values);
        if (saved) onClose();
        else showFirstErrorStep();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to save the workflow task.",
        );
      }
    },
    showFirstErrorStep,
  );

  function renderStep() {
    if (currentStep === "details") return <WorkflowTaskDetailsStep />;
    if (currentStep === "form") {
      return (
        <WorkflowTaskFormLayoutStep
          formItems={controller.formItems}
          formPurpose={controller.formPurpose}
          formVersionId={controller.formVersionId}
          formsPending={controller.forms.isPending}
        />
      );
    }
    return (
      <WorkflowTaskAssignmentStep
        assignmentItems={controller.assignmentItems}
        assignmentMode={controller.assignmentMode}
      />
    );
  }

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={task ? "Edit workflow task" : "Add workflow task"}
    >
      <FormProvider {...controller.form}>
        <form onSubmit={submit}>
          <StepProgress
            ariaLabel="Workflow task configuration"
            className="border-b border-brand-navy/10 pb-5"
            completedStepIds={completedSteps}
            currentStepId={currentStep}
            disabled={controller.mutation.isPending}
            hideLabelsOnMobile
            onStepChange={changeStep}
            steps={workflowTaskEditorSteps.map((step, index) => ({
              ...step,
              disabled:
                index > currentIndex + 1
                && !completedSteps.includes(step.id),
            }))}
          />
          <div className="min-h-80 py-6">{renderStep()}</div>
          {controller.mutation.error ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {controller.mutation.error.message}
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-brand-navy/10 pt-4">
            <GeneralButton
              disabled={currentIndex === 0 || controller.mutation.isPending}
              onClick={() =>
                setCurrentStep(workflowTaskEditorSteps[currentIndex - 1].id)
              }
              type="button"
              variant="outline"
            >
              Back
            </GeneralButton>
            {currentStep === "assignment" ? (
              <GeneralButton
                disabled={controller.mutation.isPending}
                type="submit"
              >
                {controller.mutation.isPending ? "Saving…" : "Save task"}
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
