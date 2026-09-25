"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { usePublishedForms } from "@/modules/forms/FormHooks";
import type { PublishedFormOption } from "@/modules/forms/FormTypes";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  taskAssignmentDefaults,
  type WorkflowTaskFormValues,
  workflowTaskFormSchema,
} from "./WorkflowTaskFormSchema";

export function workflowTaskFormItems(
  forms: readonly PublishedFormOption[],
  selectedVersionId: string,
  showUnavailable = true,
) {
  const items = forms.map((item) => ({
    label: `${item.formName} · v${item.versionNumber}`,
    value: item.versionId,
  }));
  if (
    selectedVersionId
    && showUnavailable
    && !items.some((item) => item.value === selectedVersionId)
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
  const duplicate = stage.tasks.some(
    (item) =>
      item.stableKey === values.stableKey &&
      item.stableKey !== task?.stableKey,
  );
  if (duplicate) {
    formSetError("stableKey", {
      message: "Task code must be unique in this stage.",
    });
    return false;
  }
  const existingConfig = task?.config && typeof task.config === "object"
    ? { ...task.config }
    : {};
  if ("items" in existingConfig) {
    delete existingConfig.items;
  }
  const nextTask: WorkflowTaskInput = {
    ...(task?.id ? { id: task.id } : {}),
    actionKeys: task?.actionKeys ?? [],
    permissions: task?.permissions ?? defaultWorkflowElementPermissions,
    assignmentMode: values.assignmentMode,
    roleId:
      values.assignmentMode === "ROLE" ? values.assignmentTarget : null,
    namedUserOverrideId:
      values.assignmentMode === "NAMED_USER" ? values.assignmentTarget : null,
    stableKey: values.stableKey,
    description: values.description,
    displayOrder: values.displayOrder,
    reviewerCount: values.reviewerCount,
    reviewRelease: task?.reviewRelease ?? "STAGE_COMPLETED",
    submittedReplacementPolicy: task?.submittedReplacementPolicy ?? "DENY",
    requiredCompletionCount: values.completionMode === "ALL"
      ? values.reviewerCount
      : values.completionMode === "COUNT"
        ? values.requiredCompletionCount ?? 1
        : 1,
    completionMode: values.completionMode,
    completionPercentage: values.completionMode === "PERCENT"
      ? values.completionPercentage
      : null,
    quorum: task?.quorum ?? false,
    quorumRule: task?.quorumRule ?? null,
    coiRequired: task?.coiRequired ?? false,
    config: {
      ...existingConfig,
    },
    formBinding: values.formVersionId
      ? {
          contextFields: task?.formBinding?.contextFields ?? [],
          formVersionId: values.formVersionId,
        }
      : null,
    name: values.name,
    required: values.required,
  };
  await mutateAsync({
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
  });
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
      stableKey: task?.stableKey ?? "",
      description: task?.description ?? "",
      displayOrder: task?.displayOrder ?? stage.tasks.length + 1,
      formVersionId: task?.formBinding?.formVersionId ?? "",
      name: task?.name ?? "",
      reviewerCount: task?.reviewerCount ?? 1,
      completionMode: task?.completionMode ?? "COUNT",
      requiredCompletionCount: task?.requiredCompletionCount ?? 1,
      completionPercentage: task?.completionPercentage ?? null,
      required: task?.required ?? true,
    },
    resolver: zodResolver(workflowTaskFormSchema),
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const formVersionId = useWatch({
    control: form.control,
    name: "formVersionId",
  });
  const previousAssignmentMode = useRef(assignmentMode);

  useEffect(() => {
    if (previousAssignmentMode.current === assignmentMode) return;
    previousAssignmentMode.current = assignmentMode;
    form.setValue("assignmentTarget", "", { shouldValidate: true });
  }, [assignmentMode, form]);

  const options = editor.assignmentOptions ?? { roles: [], users: [] };
  const assignmentItems = (
    assignmentMode === "ROLE" ? options.roles : options.users
  ).map((item) => ({ label: item.label, value: item.id }));
  const formItems = workflowTaskFormItems(
    forms.data ?? [],
    formVersionId ?? "",
    !forms.isPending,
  );

  const save = (values: WorkflowTaskFormValues) =>
    saveWorkflowTask({
      editor,
      formSetError: form.setError,
      mutateAsync: mutation.mutateAsync,
      stage,
      task,
      values,
    });

  return {
    assignmentItems,
    assignmentMode,
    form,
    formItems,
    formVersionId: formVersionId ?? "",
    forms,
    mutation,
    save,
  };
}
