"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";

import { usePublishedForms } from "@/modules/forms/FormHooks";
import { createDefaultWorkflowCommonActions } from "@/modules/workflows/domain/actions/WorkflowActionBindingPolicy";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  stableKeyFromLabel,
  uniqueStableKeyFromLabel,
} from "@/modules/workflows/domain/WorkflowStableKey";
import { useSaveWorkflowGraph } from "@/modules/workflows/WorkflowHooks";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";
import {
  type WorkflowStageEditorStep,
  workflowStageEditorStepFields,
} from "./WorkflowStageEditorSteps";
import {
  type WorkflowStageFormInput,
  type WorkflowStageFormValues,
  workflowStageFormSchema,
} from "./WorkflowStageFormSchema";

function newConditionStage(
  editor: WorkflowEditorView,
  name: string,
): WorkflowStageInput {
  return {
    actions: createDefaultWorkflowCommonActions(
      editor.assignmentOptions?.roles[0]?.id,
    ),
    checklistItems: [],
    commentFields: [],
    documentRequirements: [],
    scoring: null,
    coiGated: false,
    coiFormVersionId: null,
    description: "",
    displayOrder: editor.graph.stages.length + 1,
    enabled: true,
    entryCondition: null,
    exitCondition: null,
    initial: editor.graph.stages.length === 0,
    joinPredecessorStageKeys: [],
    name: name || "New stage",
    optional: false,
    publicStatusMapping: {
      description: "Application under review",
      label: "Under review",
      status: "UNDER_REVIEW",
    },
    repeatable: false,
    slaHours: null,
    stableKey: stableKeyFromLabel(name, "STAGE"),
    tasks: [],
  };
}

function replaceStage(
  editor: WorkflowEditorView,
  stage: WorkflowStageInput,
  nextStage: WorkflowStageInput,
) {
  return {
    stages: editor.graph.stages.map((item) =>
      item.stableKey === stage.stableKey ? nextStage : item,
    ),
    transitions: editor.graph.transitions,
  };
}

export function useWorkflowStageDialogController(
  editor: WorkflowEditorView,
  stage?: WorkflowStageInput,
) {
  const mutation = useSaveWorkflowGraph(editor);
  const forms = usePublishedForms();
  const form = useForm<
    WorkflowStageFormInput,
    unknown,
    WorkflowStageFormValues
  >({
    defaultValues: {
      name: stage?.name ?? "",
      description: stage?.description ?? "",
      enabled: stage?.enabled ?? true,
      optional: stage?.optional ?? false,
      repeatable: stage?.repeatable ?? false,
      coiGated: stage?.coiGated ?? false,
      coiFormVersionId: stage?.coiFormVersionId ?? null,
      entryCondition: stage?.entryCondition ?? null,
      exitCondition: stage?.exitCondition ?? null,
      joinPredecessorStageKeys: stage?.joinPredecessorStageKeys ?? [],
    },
    resolver: zodResolver(workflowStageFormSchema),
  });
  const coiGated = useWatch({ control: form.control, name: "coiGated" });
  const name = useWatch({ control: form.control, name: "name" });
  const conditionStage = stage
    ? { ...stage, name }
    : newConditionStage(editor, name);
  const conditionFields = useWorkflowConditionFields(editor, conditionStage);
  const coiFormItems = (forms.data ?? [])
    .filter((option) => option.purpose === "COI")
    .map((option) => ({
      label: `${option.formName} — version ${option.versionNumber}`,
      value: option.versionId,
    }));
  const predecessorItems = editor.graph.stages
    .filter((item) => item.stableKey !== stage?.stableKey)
    .map((item) => ({ label: item.name, value: item.stableKey }));

  async function save(values: WorkflowStageFormValues) {
    const stableKey = stage?.stableKey ?? uniqueStableKeyFromLabel(
      values.name,
      editor.graph.stages.map((item) => item.stableKey),
      "STAGE",
    );
    const common = {
      ...values,
      coiFormVersionId: values.coiGated
        ? values.coiFormVersionId || null
        : null,
      stableKey,
    };
    const nextGraph = stage
      ? replaceStage(editor, stage, { ...stage, ...common })
      : {
          stages: [
            ...editor.graph.stages,
            {
              ...newConditionStage(editor, values.name),
              ...common,
            },
          ],
          transitions: editor.graph.transitions,
        };
    await mutation.mutateAsync(nextGraph);
    return stableKey;
  }

  const validateStep = (step: WorkflowStageEditorStep) =>
    form.trigger([...workflowStageEditorStepFields[step]], {
      shouldFocus: true,
    });

  return {
    coiFormItems,
    coiGated,
    conditionFields,
    form,
    forms,
    mutation,
    predecessorItems,
    save,
    validateStep,
  };
}
