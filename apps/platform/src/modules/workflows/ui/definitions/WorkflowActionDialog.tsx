"use client";

import { FormProvider } from "react-hook-form";
import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StepProgress } from "@/components/ui/step-progress";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowActionBehaviourStep } from "./WorkflowActionBehaviourStep";
import { WorkflowActionDetailsStep } from "./WorkflowActionDetailsStep";
import { WorkflowActionReviewStep } from "./WorkflowActionReviewStep";
import { WorkflowActionRoutingStep } from "./WorkflowActionRoutingStep";
import { actionEditorSteps, useWorkflowActionDialog } from "./useWorkflowActionDialog";

type Props = {
  action?: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export function WorkflowActionDialog(props: Props) {
  const { action, editor, isOpen, onClose, stage } = props;
  const {
    actionPreview,
    actionType,
    changeStep,
    completedSteps,
    continueToNextStep,
    currentIndex,
    currentStep,
    deferTargetType,
    escalationTargetType,
    form,
    mutation,
    rejectionOutcomeType,
    routeError,
    routes,
    setCurrentStep,
    setRoutes,
    stableKey,
    save,
    taskStableKeys,
  } = useWorkflowActionDialog(props);
  const submit = form.handleSubmit(save);

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={action ? "Edit task action" : "Add task action"}
    >
      <FormProvider {...form}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const submitter = (event.nativeEvent as SubmitEvent).submitter;
            if (
              currentStep === "review"
              && submitter instanceof HTMLButtonElement
              && submitter.name === "saveAction"
            ) {
              void submit(event);
            }
          }}
        >
          <StepProgress
            ariaLabel="Task action configuration"
            className="border-b border-brand-navy/10 pb-5"
            completedStepIds={completedSteps}
            currentStepId={currentStep}
            disabled={mutation.isPending}
            hideLabelsOnMobile
            onStepChange={changeStep}
            steps={actionEditorSteps.map((step, index) => ({
              ...step,
              disabled:
                index > currentIndex + 1
                && !completedSteps.includes(step.id),
            }))}
          />
          <div className="min-h-80 py-6">
            {currentStep === "details" ? <WorkflowActionDetailsStep /> : null}
            {currentStep === "behaviour" ? (
              <WorkflowActionBehaviourStep
                actionExists={Boolean(action)}
                actionType={actionType}
                assignmentOptions={
                  editor.assignmentOptions ?? { roles: [], users: [] }
                }
                deferTargetType={deferTargetType}
                escalationTargetType={escalationTargetType}
                onTaskChange={(values) =>
                  form.setValue("taskStableKeys", values, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                rejectionOutcomeType={rejectionOutcomeType}
                stage={stage}
                taskStableKeys={taskStableKeys}
              />
            ) : null}
            {currentStep === "routing" ? (
              <WorkflowActionRoutingStep
                actionKey={stableKey}
                actionType={actionType}
                editor={editor}
                onChange={setRoutes}
                onRejectionOutcomeChange={(value) =>
                  form.setValue("rejectionOutcomeType", value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                routes={routes}
                stage={stage}
              />
            ) : null}
            {currentStep === "review" && actionPreview ? (
              <WorkflowActionReviewStep
                action={actionPreview}
                editor={editor}
                routes={routes}
                stage={stage}
                taskStableKeys={taskStableKeys}
              />
            ) : null}
          </div>
          {routeError || mutation.error ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {routeError ?? mutation.error?.message}
            </p>
          ) : null}
          <div className="flex items-center justify-between border-t border-brand-navy/10 pt-4">
            <GeneralButton
              disabled={currentIndex === 0 || mutation.isPending}
              onClick={() =>
                setCurrentStep(actionEditorSteps[currentIndex - 1].id)
              }
              type="button"
              variant="outline"
            >
              Back
            </GeneralButton>
            {currentStep === "review" ? (
              <GeneralButton
                disabled={mutation.isPending}
                key="save"
                name="saveAction"
                type="submit"
              >
                {mutation.isPending ? "Saving…" : "Save action"}
              </GeneralButton>
            ) : (
              <GeneralButton
                disabled={mutation.isPending}
                key="continue"
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
