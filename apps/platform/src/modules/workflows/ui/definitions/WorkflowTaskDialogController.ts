"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { usePublishedForms } from "@/modules/forms/FormHooks";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  taskAssignmentDefaults,
  type WorkflowTaskFormValues,
  workflowTaskFormSchema,
} from "./WorkflowTaskFormSchema";

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
  const nextTask: WorkflowTaskInput = {
    ...(task?.id ? { id: task.id } : {}),
    actionKeys: values.actionKeys,
    assignmentMode: values.assignmentMode,
    roleId:
      values.assignmentMode === "ROLE" ? values.assignmentTarget : null,
    namedUserOverrideId:
      values.assignmentMode === "NAMED_USER" ? values.assignmentTarget : null,
    stableKey: values.stableKey,
    description: values.description,
    displayOrder: values.displayOrder,
    reviewerCount: values.reviewerCount,
    requiredCompletionCount: values.requiredCompletionCount,
    quorum: values.quorum,
    coiRequired: values.coiRequired,
    config: task?.config ?? {},
    formVersionId: values.formVersionId || null,
    name: values.name,
    required: values.required,
    type: task?.type ?? "STRUCTURED_FORM",
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
      actionKeys: task?.actionKeys ?? [],
      checklistItems: [],
      stableKey: task?.stableKey ?? "",
      description: task?.description ?? "",
      displayOrder: task?.displayOrder ?? stage.tasks.length + 1,
      formVersionId: task?.formVersionId ?? "",
      name: task?.name ?? "",
      reviewerCount: task?.reviewerCount ?? 1,
      requiredCompletionCount: task?.requiredCompletionCount ?? 1,
      quorum: task?.quorum ?? false,
      coiRequired: task?.coiRequired ?? false,
      required: task?.required ?? true,
    },
    resolver: zodResolver(workflowTaskFormSchema),
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
  });
  const actionKeys = useWatch({
    control: form.control,
    name: "actionKeys",
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
  const formItems = (forms.data ?? []).map((item) => ({
    label: `${item.formName} · v${item.versionNumber}`,
    value: item.versionId,
  }));
  const actionItems = [...stage.actions]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((action) => ({
      disabled: !action.enabled,
      label: action.enabled ? action.label : `${action.label} (disabled)`,
      value: action.stableKey,
    }));

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
    actionKeys,
    actionItems,
    assignmentItems,
    assignmentMode,
    form,
    formItems,
    formVersionId: formVersionId ?? "",
    forms,
    mutation,
    setActionKeys: (values: string[]) => {
      form.setValue("actionKeys", values, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    save,
  };
}
