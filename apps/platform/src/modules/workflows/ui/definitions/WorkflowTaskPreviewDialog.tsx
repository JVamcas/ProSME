"use client";

import { DraggableDialog } from "@/components/ui/draggable-dialog";
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
  WorkflowCommentsPreview,
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
  const hasDocuments = stage.documentRequirements.length > 0;
  const hasScoring = Boolean(stage.scoring?.criteria.length);
  const hasComments = stage.commentFields.length > 0;
  const sectionCount = [
    hasForm,
    hasChecklist,
    hasDocuments,
    hasScoring,
    hasComments,
  ]
    .filter(Boolean).length;
  const requiredCount =
    (form.data?.fields.filter((field) => field.required).length ?? 0)
    + stage.checklistItems.filter((item) => item.mandatory).length
    + stage.documentRequirements.filter((item) => item.mandatory).length
    + (stage.scoring?.criteria.length ?? 0)
    + stage.commentFields.filter((field) => field.mandatory).length;
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
      <div className="space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-navy/50">
            {stage.name}
          </p>
          {task.description ? (
            <p className="mt-1 text-sm text-brand-navy/70">{task.description}</p>
          ) : null}
        </div>
        <WorkflowTaskPreviewSummary
          requiredCount={requiredCount}
          sectionCount={sectionCount}
        />
        <div className="space-y-3">
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
              status={`${stage.documentRequirements.filter((item) => item.mandatory).length} required documents`}
              title="Documents"
            >
              <WorkflowDocumentRequirementsPreview stage={stage} />
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
          {hasComments ? (
            <WorkflowTaskPreviewSection
              status={`${stage.commentFields.filter((field) => field.mandatory).length} required fields`}
              title="Comments & recommendations"
            >
              <WorkflowCommentsPreview stage={stage} />
            </WorkflowTaskPreviewSection>
          ) : null}
          {!sectionCount ? (
            <p className="rounded-xl bg-brand-cream p-4 text-sm text-brand-navy/70">
              No reviewer work sections are configured for this task.
            </p>
          ) : null}
        </div>
        <WorkflowTaskActions
          actions={actions}
          disabled
          onSelect={() => undefined}
        />
      </div>
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
