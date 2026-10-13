"use client";

import { useConfiguredFormPreview } from "@/modules/forms/ui/useTaskFormConfiguration";
import { taskUsesFormSections } from "../../domain/definitions/WorkflowTaskFormWork";

import {
  taskSectionOrder,
  type WorkflowTaskSectionId,
} from "../../domain/definitions/WorkflowTaskSectionOrder";

import { DraggableDialog } from "@/shared/ui/DraggableDialog";
import { usePublishedForms } from "@/modules/forms/FormHooks";
import type { PublishedFormOption } from "@/modules/forms/FormTypes";
import { WorkflowTaskFormPreview } from "./WorkflowTaskFormPreview";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskActions } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";
import { WorkflowTaskReviewLayout } from "@/modules/workflows/ui/WorkflowTaskReviewLayout";
import {
  workflowActionInputMetadata,
  workflowActionPresentation,
} from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import { taskDisplayMode } from "@/modules/workflows/WorkflowTaskRegistry";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowTaskPreviewSummary } from "./WorkflowTaskPreviewSections";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";

import {
  workflowTaskInheritsEligibilityForm,
  WorkflowTaskEligibilityPreview,
} from "./WorkflowTaskEligibilityPreview";

export function WorkflowTaskPreviewDialog({
  onSectionOrderChange,
  onFormSectionOrderChange,
  orderingPending,
  definitionId,
  onClose,
  stage,
  task,
  versionId,
}: {
  onFormSectionOrderChange?: (ids: string[]) => void;
  onSectionOrderChange?: (ids: WorkflowTaskSectionId[]) => void;
  orderingPending?: boolean;
  definitionId: string;
  onClose: () => void;
  stage: WorkflowStageInput;
  task: WorkflowTaskInput;
  versionId: string;
}) {
  const inheritsEligibilityForm = workflowTaskInheritsEligibilityForm(task);
  const formVersionId = inheritsEligibilityForm
    ? null
    : (task.formBinding?.formVersionId ?? null);
  const form = useConfiguredFormPreview(formVersionId);
  const publishedForms = usePublishedForms();
  const actions = workflowTaskPreviewActions(stage, task);
  const hasForm = inheritsEligibilityForm || Boolean(task.formBinding);
  const taskChecklistItems = workflowTaskChecklistItems(stage, task);
  const requiredChecklistCount = taskChecklistItems.filter(
    (item) => item.mandatory,
  ).length;
  const hasChecklist = taskChecklistItems.length > 0;
  const taskDocuments = stage.documentRequirements.filter(
    (requirement) =>
      requirement.taskStableKey === task.stableKey &&
      !taskUsesFormSections(task.config),
  );
  const hasDocuments = taskDocuments.length > 0;
  const taskScoring =
    stage.scoring?.find(
      (scoring) => scoring.taskStableKey === task.stableKey,
    ) ?? null;
  const hasScoring = Boolean(taskScoring?.criteria.length);
  const commentFields = (stage.commentFields ?? [])
    .filter((field) => field.taskStableKey === task.stableKey)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const displayMode = taskDisplayMode(task.config);
  const sectionCount = [
    hasForm,
    hasChecklist,
    hasDocuments,
    hasScoring,
    commentFields.length > 0,
  ].filter(Boolean).length;
  const showActionsInFinalStep =
    displayMode === "STEP_PROGRESS" && sectionCount > 0;
  const requiredCount =
    (form.data?.fields.filter((field) => field.required).length ?? 0) +
    requiredChecklistCount +
    taskDocuments.filter((item) => item.mandatory).length +
    (hasScoring ? (taskScoring?.criteria.length ?? 0) : 0) +
    commentFields.filter((field) => field.mandatory).length;
  const formName = workflowTaskPreviewFormName(
    publishedForms.data,
    formVersionId ?? undefined,
  );
  const previewActions = (
    <WorkflowTaskActions
      actions={actions}
      disabled
      onSelect={() => undefined}
    />
  );

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      panelClassName={""}
      size="2xl"
      title={`${task.name} - Reviewer's preview`}
    >
      {onSectionOrderChange && displayMode === "STEP_PROGRESS" ? (
        <p className="mb-4 text-sm text-brand-navy/65" role="status">
          {orderingPending
            ? "Saving step order…"
            : "Drag the handles to rearrange steps. Changes save to this draft. You can also use Space and the arrow keys."}
        </p>
      ) : null}
      <WorkflowTaskReviewLayout
        actions={showActionsInFinalStep ? undefined : previewActions}
        description={task.description}
        sectionCount={sectionCount}
        stageName={stage.name}
        summary={
          <WorkflowTaskPreviewSummary
            requiredCount={requiredCount}
            sectionCount={sectionCount}
          />
        }
      >
        <WorkflowTaskWorkSections
          sectionOrder={taskSectionOrder(task.config)}
          onSectionOrderChange={onSectionOrderChange}
          orderingPending={orderingPending}
          checklistItems={taskChecklistItems.map((item) => ({
            code: item.key,
            label: item.text,
            required: item.mandatory,
          }))}
          commentFields={commentFields}
          disabled
          displayMode={displayMode}
          documentRequirements={taskDocuments.map((requirement) => ({
            ...requirement,
            requestStatus: "MISSING" as const,
          }))}
          finalActions={showActionsInFinalStep ? previewActions : undefined}
          form={
            hasForm
              ? {
                  hideWrapper: !inheritsEligibilityForm,
                  content: inheritsEligibilityForm ? (
                    <WorkflowTaskEligibilityPreview
                      definitionId={definitionId}
                      versionId={versionId}
                    />
                  ) : (
                    <WorkflowTaskFormPreview
                      form={form}
                      config={task.config}
                      onOrderChange={onFormSectionOrderChange}
                      orderingPending={orderingPending}
                    />
                  ),
                  title:
                    inheritsEligibilityForm && !formVersionId
                      ? "Eligibility verification"
                      : formName,
                }
              : undefined
          }
          scoring={taskScoring}
          status={{
            checklist: `${requiredChecklistCount} required items`,
            comments: `${commentFields.filter((field) => field.mandatory).length} required fields`,
            documents: `${taskDocuments.filter((item) => item.mandatory).length} required documents`,
            form:
              inheritsEligibilityForm && !formVersionId
                ? "From funding call"
                : `${form.data?.fields.filter((field) => field.required).length ?? 0} required fields`,
            scoring: `${hasScoring ? (taskScoring?.criteria.length ?? 0) : 0} criteria`,
          }}
        />
      </WorkflowTaskReviewLayout>
    </DraggableDialog>
  );
}

export function workflowTaskChecklistItems(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
) {
  return stage.checklistItems.filter(
    (item) => item.taskStableKey === task.stableKey,
  );
}

export function workflowTaskPreviewPanelClass() {
  return "w-full max-w-6xl";
}

export function workflowTaskPreviewFormName(
  forms: PublishedFormOption[] | undefined,
  versionId: string | undefined,
) {
  return (
    forms?.find((form) => form.versionId === versionId)?.formName ?? "Form"
  );
}

export function workflowTaskPreviewActions(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
) {
  const selected = new Set(task.actionKeys);
  return stage.actions
    .filter((action) => action.enabled && selected.has(action.stableKey))
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((action) => ({
      actionType: action.actionType,
      available: false,
      key: action.stableKey,
      label: action.label,
      presentation: workflowActionPresentation(action),
      requiredInput: workflowActionInputMetadata(action),
      runtimeVersion: 1,
      unavailableReason: "Preview only.",
    })) satisfies WorkflowTaskAction[];
}
