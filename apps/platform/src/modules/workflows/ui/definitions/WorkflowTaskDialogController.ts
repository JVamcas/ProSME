"use client";

import { useEffect, useRef } from "react";
import { eligibilityHardFailureStatus } from "../../domain/definitions/WorkflowEligibilityFailureStatus";
import { useForm, useWatch, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { usePublishedForms } from "@/modules/forms/FormHooks";
import type {
  FormPurpose,
  PublishedFormOption,
} from "@/modules/forms/FormTypes";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { reconcileWorkflowActionBindings } from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import { uniqueStableKeyFromLabel } from "@/modules/workflows/domain/WorkflowStableKey";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  taskAssignmentDefaults,
  type WorkflowTaskFormValues,
  workflowTaskFormSchema,
} from "./WorkflowTaskFormSchema";
import {
  type WorkflowTaskEditorStep,
  workflowTaskEditorStepFields,
} from "./WorkflowTaskEditorSteps";

export function workflowTaskFormItems(
  forms: readonly PublishedFormOption[],
  selectedVersionId: string,
  showUnavailable = true,
  purpose?: FormPurpose,
) {
  const items = forms
    .filter((item) => !purpose || item.purpose === purpose)
    .map((item) => ({
      label: `${item.formName} · v${item.versionNumber}`,
      value: item.versionId,
    }));
  if (
    selectedVersionId &&
    showUnavailable &&
    !items.some((item) => item.value === selectedVersionId)
  ) {
    items.unshift({
      label: "Unavailable form version — remove or replace",
      value: selectedVersionId,
    });
  }
  return items;
}

async function saveWorkflowTask({
  editor,
  formSetError,
  mutateAsync,
  stage,
  task,
  values,
}: {
  editor: WorkflowEditorView;
  formSetError: UseFormSetError<WorkflowTaskFormValues>;
  mutateAsync: ReturnType<typeof useSaveWorkflowGraph>["mutateAsync"];
  stage: WorkflowStageInput;
  task?: WorkflowTaskInput;
  values: WorkflowTaskFormValues;
}) {
  const otherDecisionTask = stage.tasks.some(
    (item) =>
      item.taskType === "STAGE_DECISION" && item.stableKey !== task?.stableKey,
  );
  if (values.taskType === "STAGE_DECISION" && otherDecisionTask) {
    formSetError("taskType", {
      message: "A stage can contain only one stage-decision task.",
    });
    return false;
  }
  if (stage.tasks.some((item) =>
    item.stableKey !== task?.stableKey
    && item.displayOrder === values.displayOrder,
  )) {
    formSetError("displayOrder", {
      message: "Choose a display order that is not used by another task in this stage.",
    });
    return false;
  }
  const existingConfig =
    task?.config && typeof task.config === "object"
      ? ({ ...task.config } as Record<string, unknown>)
      : {};
  if ("items" in existingConfig) {
    delete existingConfig.items;
  }
  delete existingConfig.hardFailureStatus;
  delete existingConfig.command;
  delete existingConfig.reevaluationPolicy;
  const nextTask: WorkflowTaskInput = {
    ...(task?.id ? { id: task.id } : {}),
    actionKeys: task?.actionKeys ?? [],
    permissions: task?.permissions ?? defaultWorkflowElementPermissions,
    assignmentMode: values.assignmentMode,
    taskType: values.taskType,
    roleId: values.assignmentMode === "ROLE" ? values.assignmentTarget : null,
    namedUserOverrideId:
      values.assignmentMode === "NAMED_USER" ? values.assignmentTarget : null,
    stableKey: task?.stableKey ?? uniqueStableKeyFromLabel(
      values.name,
      stage.tasks.map((item) => item.stableKey),
      "TASK",
    ),
    description: values.description,
    displayOrder: values.displayOrder,
    reviewerCount: values.reviewerCount,
    reviewRelease: task?.reviewRelease ?? "STAGE_COMPLETED",
    submittedReplacementPolicy: task?.submittedReplacementPolicy ?? "DENY",
    requiredCompletionCount:
      values.completionMode === "ALL"
        ? values.reviewerCount
        : values.completionMode === "COUNT"
          ? (values.requiredCompletionCount ?? 1)
          : 1,
    completionMode: values.completionMode,
    completionPercentage:
      values.completionMode === "PERCENT" ? values.completionPercentage : null,
    quorum: false,
    quorumRule: null,
    config: {
      ...existingConfig,
      displayMode: values.displayMode,
      formPurpose: values.formPurpose,
      ...(values.formPurpose === "ELIGIBILITY_VERIFICATION"
        ? {
            hardFailureStatus: values.hardFailureStatus,
            command: "AUTHORITATIVE_ELIGIBILITY",
            reevaluationPolicy: "WHEN_EVIDENCE_CHANGED",
          }
        : {}),
    },
    formBinding:
      values.formPurpose !== "ELIGIBILITY_VERIFICATION" && values.formVersionId
        ? {
            contextFields: task?.formBinding?.contextFields ?? [],
            formVersionId: values.formVersionId,
          }
        : null,
    name: values.name,
    required: values.required,
  };
  const nextGraph = {
    stages: editor.graph.stages.map((item) =>
      item.stableKey === stage.stableKey
        ? {
            ...item,
            tasks: task
              ? item.tasks.map((current) =>
                  current.stableKey === task.stableKey ? nextTask : current,
                )
              : [...item.tasks, nextTask],
          }
        : item,
    ),
    transitions: editor.graph.transitions,
  };
  await mutateAsync(reconcileWorkflowActionBindings(editor.graph, nextGraph));
  return true;
}

export function useWorkflowTaskDialogController(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput,
  task?: WorkflowTaskInput,
) {
  const mutation = useSaveWorkflowGraph(editor);
  const forms = usePublishedForms();
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      ...taskAssignmentDefaults(task),
      taskType: task?.taskType ?? "CONTRIBUTING",
      description: task?.description ?? "",
      displayMode:
        task?.config &&
        typeof task.config === "object" &&
        "displayMode" in task.config &&
        task.config.displayMode === "SECTIONS"
          ? "SECTIONS"
          : "STEP_PROGRESS",
      displayOrder: task?.displayOrder ?? Math.max(
        0,
        ...stage.tasks.map((item) => item.displayOrder),
      ) + 1,
      formVersionId: task?.formBinding?.formVersionId ?? "",
      formPurpose:
        task?.config &&
        typeof task.config === "object" &&
        ("formPurpose" in task.config || "command" in task.config) &&
        (("formPurpose" in task.config && task.config.formPurpose === "ELIGIBILITY_VERIFICATION")
          || ("command" in task.config && task.config.command === "AUTHORITATIVE_ELIGIBILITY"))
          ? "ELIGIBILITY_VERIFICATION"
          : "APPLICATION_REVIEW",
      name: task?.name ?? "",
      reviewerCount: task?.reviewerCount ?? 1,
      completionMode: task?.completionMode ?? "COUNT",
      requiredCompletionCount: task?.requiredCompletionCount ?? 1,
      completionPercentage: task?.completionPercentage ?? null,
      required: task?.required ?? true,
      hardFailureStatus: eligibilityHardFailureStatus(task?.config ?? {}),
    },
    resolver: zodResolver(workflowTaskFormSchema),
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const taskType = useWatch({
    control: form.control,
    name: "taskType",
  });
  const formPurpose = useWatch({
    control: form.control,
    name: "formPurpose",
  });
  const formVersionId = useWatch({
    control: form.control,
    name: "formVersionId",
  });
  const previousAssignmentMode = useRef(assignmentMode);
  const previousFormPurpose = useRef(formPurpose);

  useEffect(() => {
    if (taskType !== "STAGE_DECISION") return;
    form.setValue("reviewerCount", 1, { shouldValidate: true });
    form.setValue("completionMode", "ALL", { shouldValidate: true });
    form.setValue("requiredCompletionCount", 1, { shouldValidate: true });
    form.setValue("completionPercentage", null, { shouldValidate: true });
  }, [form, taskType]);

  useEffect(() => {
    if (previousAssignmentMode.current === assignmentMode) return;
    previousAssignmentMode.current = assignmentMode;
    form.setValue("assignmentTarget", "", { shouldValidate: true });
  }, [assignmentMode, form]);

  useEffect(() => {
    if (previousFormPurpose.current === formPurpose) return;
    previousFormPurpose.current = formPurpose;
    form.setValue("formVersionId", "", { shouldValidate: true });
  }, [formPurpose, form]);

  const options = editor.assignmentOptions ?? { roles: [], users: [] };
  const assignmentItems = (
    assignmentMode === "ROLE" ? options.roles : options.users
  ).map((item) => ({ label: item.label, value: item.id }));
  const formItems = workflowTaskFormItems(
    forms.data ?? [],
    formVersionId ?? "",
    !forms.isPending,
    formPurpose,
  );

  const save = (values: WorkflowTaskFormValues) => {
    if (
      values.formPurpose !== "ELIGIBILITY_VERIFICATION" &&
      values.formVersionId &&
      !forms.data?.some(
        (item) =>
          item.versionId === values.formVersionId &&
          item.purpose === values.formPurpose,
      )
    ) {
      form.setError("formVersionId", {
        message: "Select a published form with the chosen purpose.",
      });
      return Promise.resolve(false);
    }
    return saveWorkflowTask({
      editor,
      formSetError: form.setError,
      mutateAsync: mutation.mutateAsync,
      stage,
      task,
      values,
    });
  };

  const validateStep = async (step: WorkflowTaskEditorStep) => {
    const valid = await form.trigger([...workflowTaskEditorStepFields[step]], {
      shouldFocus: true,
    });
    if (step !== "details") return valid;

    const values = form.getValues();
    const otherDecisionTask = stage.tasks.some(
      (item) =>
        item.taskType === "STAGE_DECISION"
        && item.stableKey !== task?.stableKey,
    );
    if (values.taskType === "STAGE_DECISION" && otherDecisionTask) {
      form.setError("taskType", {
        message: "A stage can contain only one stage-decision task.",
      });
    }
    const duplicateOrder = stage.tasks.some((item) =>
      item.stableKey !== task?.stableKey
      && item.displayOrder === values.displayOrder,
    );
    if (duplicateOrder) {
      form.setError("displayOrder", {
        message: "Choose a display order that is not used by another task in this stage.",
      });
    }
    return valid
      && !duplicateOrder
      && !(values.taskType === "STAGE_DECISION" && otherDecisionTask);
  };

  return {
    assignmentItems,
    assignmentMode,
    form,
    formItems,
    formVersionId: formVersionId ?? "",
    formPurpose,
    forms,
    mutation,
    save,
    validateStep,
  };
}
