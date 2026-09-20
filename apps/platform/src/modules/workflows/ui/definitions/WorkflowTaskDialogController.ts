"use client";

import { useEffect, useRef } from "react";
import { useForm, useWatch, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import { usePublishedForms } from "@/modules/forms/FormHooks";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowRuntimeContextFields } from "@/modules/workflows/domain/WorkflowRuntimeContextFieldCatalogue";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  taskAssignmentDefaults,
  type WorkflowTaskFormValues,
  workflowTaskFormSchema,
} from "./WorkflowTaskFormSchema";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

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
    permissions: {
      view: values.viewPermission,
      edit: values.editPermission,
      decide: values.decidePermission,
      visibility: values.visibility,
    },
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
    formBinding: values.formVersionId
      ? {
          contextFields: values.contextFields,
          formVersionId: values.formVersionId,
        }
      : null,
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
  const contextFieldPool = useWorkflowConditionFields(editor, stage);
  const form = useForm<WorkflowTaskFormValues>({
    defaultValues: {
      ...taskAssignmentDefaults(task),
      actionKeys: task?.actionKeys ?? [],
      viewPermission: task
        ? task.permissions.view
        : defaultWorkflowElementPermissions.view,
      editPermission: task
        ? task.permissions.edit
        : defaultWorkflowElementPermissions.edit,
      decidePermission: task
        ? task.permissions.decide
        : defaultWorkflowElementPermissions.decide,
      visibility: task
        ? task.permissions.visibility
        : defaultWorkflowElementPermissions.visibility,
      checklistItems: [],
      stableKey: task?.stableKey ?? "",
      description: task?.description ?? "",
      displayOrder: task?.displayOrder ?? stage.tasks.length + 1,
      formVersionId: task?.formBinding?.formVersionId ?? "",
      name: task?.name ?? "",
      reviewerCount: task?.reviewerCount ?? 1,
      requiredCompletionCount: task?.requiredCompletionCount ?? 1,
      quorum: task?.quorum ?? false,
      coiRequired: task?.coiRequired ?? false,
      contextFields: task?.formBinding?.contextFields ?? [],
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
  const selectedContextFields = useWatch({
    control: form.control,
    name: "contextFields",
  }) ?? [];
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
  const contextFieldsByKey = new Map<string, ConditionFieldDefinition>();
  [
    ...workflowRuntimeContextFields,
    ...contextFieldPool.entryFields,
    ...selectedContextFields,
  ].forEach(
    (field) => contextFieldsByKey.set(field.key, field),
  );
  const contextFields = [...contextFieldsByKey.values()];

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
    contextFieldItems: contextFields,
    contextFieldKeys: selectedContextFields.map((field) => field.key),
    contextFieldsPending: contextFieldPool.isPending,
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
    setContextFieldKeys: (keys: string[]) => {
      form.setValue(
        "contextFields",
        keys.flatMap((key) => {
          const field = contextFieldsByKey.get(key);
          return field ? [field] : [];
        }),
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    },
    save,
  };
}
