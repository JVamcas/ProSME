"use client";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { FormTextarea } from "@/components/ui/form-fields";
import {
  usePublishedFormRuntime,
  usePublishedForms,
} from "@/modules/forms/FormHooks";
import type {
  PublishedFormOption,
} from "@/modules/forms/FormTypes";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";
import { WorkflowTaskReviewLayout } from "@/modules/workflows/ui/WorkflowTaskReviewLayout";
import {
  workflowActionInputMetadata,
  workflowActionPresentation,
} from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import type {
  WorkflowStageInput,
  WorkflowTaskInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  WorkflowChecklistPreview,
  WorkflowDocumentRequirementsPreview,
  WorkflowScoringPreview,
  WorkflowTaskPreviewSection,
  WorkflowTaskPreviewSummary,
} from "./WorkflowTaskPreviewSections";

type PublishedFormQuery = ReturnType<typeof usePublishedFormRuntime>;

function StructuredFormPreview({
  form,
}: {
  form: PublishedFormQuery;
}) {
  if (form.isPending) return <p className="text-sm">Loading form preview…</p>;
  if (form.isError || !form.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {form.error?.message ?? "The bound form is unavailable."}
      </p>
    );
  }
  return (
    <FormRenderer
      definition={form.data}
      formData={{}}
      onChange={() => undefined}
      onSubmit={() => undefined}
      readOnly
    >
      <></>
    </FormRenderer>
  );
}

export function WorkflowTaskPreviewDialog({
  onClose,
  stage,
  task,
}: {
  onClose: () => void;
  stage: WorkflowStageInput;
  task: WorkflowTaskInput;
}) {
  const form = usePublishedFormRuntime(task.formBinding?.formVersionId ?? null);
  const publishedForms = usePublishedForms();
  const actions = workflowTaskPreviewActions(stage, task);
  const hasForm = Boolean(task.formBinding);
  const hasChecklist = stage.checklistItems.length > 0;
  const taskDocuments = stage.documentRequirements.filter(
    (requirement) => requirement.taskStableKey === task.stableKey,
  );
  const hasDocuments = taskDocuments.length > 0;
  const hasScoring = Boolean(stage.scoring?.criteria.length);
  const commentFields = (stage.commentFields ?? [])
    .filter((field) => field.taskStableKey === task.stableKey)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const sectionCount = [
    hasForm,
    hasChecklist,
    hasDocuments,
    hasScoring,
    commentFields.length > 0,
  ]
    .filter(Boolean).length;
  const requiredCount =
    (form.data?.fields.filter((field) => field.required).length ?? 0)
    + stage.checklistItems.filter((item) => item.mandatory).length
    + taskDocuments.filter((item) => item.mandatory).length
    + (stage.scoring?.criteria.length ?? 0)
    + commentFields.filter((field) => field.mandatory).length;
  const formName = workflowTaskPreviewFormName(
    publishedForms.data,
    task.formBinding?.formVersionId,
  );
  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      panelClassName={""}
      size="2xl"
      title={`${task.name} - Reviewer's preview`}
    >
      <WorkflowTaskReviewLayout
        actions={
          <WorkflowTaskActions
            actions={actions}
            disabled
            onSelect={() => undefined}
          />
        }
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
        {hasForm ? (
          <WorkflowTaskPreviewSection
            status={`${form.data?.fields.filter((field) => field.required).length ?? 0} required fields`}
            title={formName}
          >
            <StructuredFormPreview form={form} />
          </WorkflowTaskPreviewSection>
        ) : null}
        {hasChecklist ? (
          <WorkflowTaskPreviewSection
            status={`${stage.checklistItems.filter((item) => item.mandatory).length} required items`}
            title="Checklist"
          >
            <WorkflowChecklistPreview stage={stage} />
          </WorkflowTaskPreviewSection>
        ) : null}
        {hasDocuments ? (
          <WorkflowTaskPreviewSection
            status={`${taskDocuments.filter((item) => item.mandatory).length} required documents`}
            title="Documents"
          >
            <WorkflowDocumentRequirementsPreview
              stage={stage}
              taskStableKey={task.stableKey}
            />
          </WorkflowTaskPreviewSection>
        ) : null}
        {hasScoring ? (
          <WorkflowTaskPreviewSection
            status={`${stage.scoring?.criteria.length ?? 0} criteria`}
            title="Scoring"
          >
            <WorkflowScoringPreview stage={stage} />
          </WorkflowTaskPreviewSection>
        ) : null}
        {commentFields.length ? (
          <WorkflowTaskPreviewSection
            status={`${commentFields.filter((field) => field.mandatory).length} required fields`}
            title="Comments & Recommendations"
          >
            <div className="space-y-4">
              {commentFields.map((field) => (
                <div key={field.key}>
                  <FormTextarea
                    className="min-h-24"
                    disabled
                    label={field.label}
                    required={field.mandatory}
                  />
                  {field.helpText ? (
                    <p className="mt-1 text-xs text-brand-navy/60">
                      {field.helpText}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </WorkflowTaskPreviewSection>
        ) : null}
      </WorkflowTaskReviewLayout>
    </DraggableDialog>
  );
}

export function workflowTaskPreviewPanelClass() {
  return "w-full max-w-6xl";
}

export function workflowTaskPreviewFormName(
  forms: PublishedFormOption[] | undefined,
  versionId: string | undefined,
) {
  return forms?.find((form) => form.versionId === versionId)?.formName ?? "Form";
}

export function workflowTaskPreviewActions(
  stage: WorkflowStageInput,
  task: WorkflowTaskInput,
) {
  const selected = new Set(task.actionKeys);
  return stage.actions
    .filter(
      (action) =>
        action.enabled
        && selected.has(action.stableKey),
    )
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
