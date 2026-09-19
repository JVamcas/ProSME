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
    (item) => item.code === values.code && item.code !== task?.code,
  );
  if (duplicate) {
    formSetError("code", {
      message: "Task code must be unique in this stage.",
    });
    return false;
  }
  const nextTask: WorkflowTaskInput = {
    ...(task?.id ? { id: task.id } : {}),
    assignmentRoleId:
      values.assignmentMode === "ROLE" ? values.assignmentTarget : null,
    assignmentUserId:
      values.assignmentMode === "USER" ? values.assignmentTarget : null,
    code: values.code,
    config: task?.config ?? {},
    formVersionId: values.formVersionId,
    name: values.name,
    required: values.required,
    sequence: task?.sequence ?? stage.tasks.length + 1,
    type: task?.type ?? "STRUCTURED_FORM",
  };
  await mutateAsync({
    stages: editor.graph.stages.map((item) =>
      item.code === stage.code
        ? {
            ...item,
            tasks: task
              ? item.tasks.map((current) =>
                  current.code === task.code ? nextTask : current,
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
      checklistItems: [],
      code: task?.code ?? "",
      formVersionId: task?.formVersionId ?? "",
      name: task?.name ?? "",
      required: task?.required ?? true,
    },
    resolver: zodResolver(workflowTaskFormSchema),
  });
  const assignmentMode = useWatch({
    control: form.control,
    name: "assignmentMode",
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
    forms,
    mutation,
    save,
  };
}
