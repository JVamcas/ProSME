"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { uniqueStableKeyFromLabel } from "@/modules/workflows/domain/WorkflowStableKey";
import {
  type FieldPath,
  type UseFormReturn,
  useForm,
  useWatch,
} from "react-hook-form";

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
import {
  workflowActionRoutes,
} from "./WorkflowActionEditorRoutes";
import {
  toWorkflowActionDefinition,
  workflowActionFormDefaults,
  workflowActionUpdatedGraph,
} from "./WorkflowActionFormMapping";
import {
  type WorkflowActionFormValues,
  workflowActionFormSchema,
} from "./WorkflowActionFormSchema";

type Props = {
  action?: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  isOpen: boolean;
  onClose: () => void;
  stage: WorkflowStageInput;
};

export const actionEditorSteps = [
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
  "reasonRequired",
];

async function validateDetails(
  form: UseFormReturn<WorkflowActionFormValues>,
  stage: WorkflowStageInput,
  action?: WorkflowActionDefinition,
) {
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

export function useWorkflowActionDialog({
  action,
  editor,
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
  const label = useWatch({ control: form.control, name: "label" });
  const stableKey = action?.stableKey ?? uniqueStableKeyFromLabel(
    label,
    stage.actions.map((item) => item.stableKey),
    "ACTION",
  );
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
    form.setValue("stableKey", stableKey, { shouldValidate: true });
  }, [form, stableKey]);

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

  async function continueToNextStep() {
    const valid = currentStep === "details"
      ? await validateDetails(form, stage, action)
      : currentStep === "behaviour" && actionType === "REJECT"
        ? await form.trigger("taskStableKeys", { shouldFocus: true })
        : await form.trigger(undefined, { shouldFocus: true });
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

  const save = async (values: WorkflowActionFormValues) => {
    if (currentStep !== "review" || mutation.isPending) return;
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
    const nextGraph = workflowActionUpdatedGraph(
      editor,
      stage,
      action,
      nextAction,
      values.taskStableKeys,
      routes,
    );
    await mutation.mutateAsync(
      reconcileWorkflowActionBindings(editor.graph, nextGraph),
    );
    onClose();
  };

  const actionPreview = currentStep === "review"
    ? toWorkflowActionDefinition(
        form.getValues(),
        action?.id,
        action?.condition,
      )
    : null;

  return {
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
  };
}
