"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import {
  FormProvider,
  type FieldPath,
  useForm,
  useWatch,
} from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { StepProgress } from "@/components/ui/step-progress";
import {
  isWorkflowStageDecisionAction,
  type WorkflowActionDefinition,
} from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { reconcileWorkflowActionBindings } from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { WorkflowActionBehaviourStep } from "./WorkflowActionBehaviourStep";
import { WorkflowActionDetailsStep } from "./WorkflowActionDetailsStep";
import {
  replaceWorkflowActionRoutes,
  workflowActionRoutes,
} from "./WorkflowActionEditorRoutes";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
} from "./WorkflowActionFormMapping";
import {
  type WorkflowActionFormValues,
  workflowActionFormSchema,
} from "./WorkflowActionFormSchema";
import { WorkflowActionReviewStep } from "./WorkflowActionReviewStep";
import { WorkflowActionRoutingStep } from "./WorkflowActionRoutingStep";

type Props = {
  action?: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
};

const actionEditorSteps = [
  { id: "details", label: "Action details" },
  { id: "behaviour", label: "Behaviour" },
  { id: "routing", label: "Routing" },
  { id: "review", label: "Review" },
] as const;

type ActionEditorStep = (typeof actionEditorSteps)[number]["id"];

const detailFields: FieldPath<WorkflowActionFormValues>[] = [
  "stableKey",
  "label",
  "actionType",
  "displayOrder",
  "enabled",
];

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
  const [currentStep, setCurrentStep] = useState<ActionEditorStep>("details");
  const [completedSteps, setCompletedSteps] = useState<ActionEditorStep[]>([]);
  const [routes, setRoutes] = useState<WorkflowTransitionDefinition[]>(() =>
    action
      ? workflowActionRoutes(
          editor.graph.transitions,
          stage.stableKey,
          action.stableKey,
        )
      : [],
  );
  const [routeError, setRouteError] = useState<string | null>(null);
  const actionType = useWatch({ control: form.control, name: "actionType" });
  const taskStableKeys = useWatch({
    control: form.control,
    name: "taskStableKeys",
  });
  const stableKey = useWatch({ control: form.control, name: "stableKey" });
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
  const currentIndex = actionEditorSteps.findIndex(
    (step) => step.id === currentStep,
  );

  useEffect(() => {
    if (previousActionType.current === actionType) return;
    previousActionType.current = actionType;
    const decisionTask = stage.tasks.find(
      (task) => task.taskType === "STAGE_DECISION",
    );
    form.setValue(
      "taskStableKeys",
      isWorkflowStageDecisionAction(actionType)
        ? decisionTask
          ? [decisionTask.stableKey]
          : []
        : stage.tasks.map((task) => task.stableKey),
      { shouldDirty: true, shouldValidate: true },
    );
  }, [actionType, form, stage.tasks]);

  useEffect(() => {
    if (previousEscalationTargetType.current === escalationTargetType) return;
    previousEscalationTargetType.current = escalationTargetType;
    form.setValue("escalationTargetId", "", { shouldValidate: true });
  }, [escalationTargetType, form]);

  useEffect(() => {
    if (actionType !== "REJECT" || routes.length === 0) return;
    form.setValue(
      "rejectionOutcomeType",
      routes[0].terminalOutcome ? "TERMINAL" : "TRANSITION",
      { shouldValidate: true },
    );
  }, [actionType, form, routes]);

  async function validateDetails() {
    const valid = await form.trigger(detailFields, { shouldFocus: true });
    const values = form.getValues();
    const duplicateKey = stage.actions.some(
      (item) =>
        item.stableKey === values.stableKey
        && item.stableKey !== action?.stableKey,
    );
    const duplicateOrder = stage.actions.some(
      (item) =>
        item.displayOrder === values.displayOrder
        && item.stableKey !== action?.stableKey,
    );
    if (duplicateKey) {
      form.setError("stableKey", {
        message: "Action key must be unique in this stage.",
      });
    }
    if (duplicateOrder) {
      form.setError("displayOrder", {
        message: "Display order must be unique in this stage.",
      });
    }
    return valid && !duplicateKey && !duplicateOrder;
  }

  async function validateCurrentStep() {
    if (currentStep === "details") return validateDetails();
    if (currentStep === "behaviour") {
      return form.trigger(undefined, { shouldFocus: true });
    }
    return true;
  }

  async function continueToNextStep() {
    const valid = await validateCurrentStep();
    if (!valid || currentIndex === actionEditorSteps.length - 1) return;
    setCompletedSteps((steps) =>
      steps.includes(currentStep) ? steps : [...steps, currentStep],
    );
    setCurrentStep(actionEditorSteps[currentIndex + 1].id);
  }

  async function changeStep(step: ActionEditorStep, index: number) {
    if (index <= currentIndex || completedSteps.includes(step)) {
      setCurrentStep(step);
      return;
    }
    if (index === currentIndex + 1) await continueToNextStep();
  }

  const submit = form.handleSubmit(async (values) => {
    if (currentStep !== "review") return;
    setRouteError(null);
    if (actionType === "REJECT" && routes.length > 1) {
      const targetTypes = new Set(
        routes.map((route) => route.terminalOutcome ? "TERMINAL" : "STAGE"),
      );
      if (targetTypes.size > 1) {
        setRouteError("Rejection routes must all use the same destination type.");
        setCurrentStep("routing");
        return;
      }
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
                const actionKeys = task.actionKeys.filter(
                  (key) =>
                    key !== action?.stableKey
                    && key !== nextAction.stableKey,
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
      transitions: replaceWorkflowActionRoutes(
        editor.graph.transitions,
        stage.stableKey,
        action?.stableKey,
        nextAction.stableKey,
        routes,
      ),
    };
    await mutation.mutateAsync(
      reconcileWorkflowActionBindings(editor.graph, nextGraph),
    );
    onClose();
  });

  const actionPreview = currentStep === "review"
    ? toWorkflowActionDefinition(
        form.getValues(),
        action?.id,
        action?.condition,
      )
    : null;

  return (
    <DraggableDialog
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      title={action ? "Edit task action" : "Add task action"}
    >
      <FormProvider {...form}>
        <form onSubmit={submit}>
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
              <GeneralButton disabled={mutation.isPending} type="submit">
                {mutation.isPending ? "Saving…" : "Save action"}
              </GeneralButton>
            ) : (
              <GeneralButton
                disabled={mutation.isPending}
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
