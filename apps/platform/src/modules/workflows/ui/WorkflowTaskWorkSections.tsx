"use client";

import { useEffect, type ReactNode } from "react";

import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import { Input } from "@/shared/ui/FormPrimitives";
import {
  orderTaskSections,
  type WorkflowTaskSectionId,
} from "../domain/definitions/WorkflowTaskSectionOrder";
import { WorkflowTaskStepLayout } from "./WorkflowTaskStepLayout";
import type {
  ChecklistConfigurationItem,
  DocumentRequirementItem,
  ScoringConfiguration,
} from "@/modules/work-queue/TaskTypes";
import type { WorkflowTaskDisplayMode } from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";
import { WorkflowTaskPreviewSection } from "./definitions/WorkflowTaskPreviewSections";
import { WorkflowTaskDocumentsSection } from "./WorkflowTaskDocumentsSection";

export type TaskWorkSection = {
  content: ReactNode;
  id: WorkflowTaskSectionId;
  status: string;
  title: string;
};

export type WorkflowTaskWorkStatus = {
  checklist: string;
  comments: string;
  documents: string;
  form: string;
  scoring: string;
};

export type WorkflowTaskWorkSectionsProps = {
  sectionOrder?: readonly WorkflowTaskSectionId[];
  onSectionOrderChange?: (ids: WorkflowTaskSectionId[]) => void;
  orderingPending?: boolean;
  checklistItems: ChecklistConfigurationItem[];
  commentFields: {
    helpText: string;
    key: string;
    label: string;
    mandatory: boolean;
  }[];
  disabled: boolean;
  readOnly?: boolean;
  taskId?: string;
  documentUpload?: {
    error?: string;
    onFile: (requirementId: string, file: File) => void;
    pendingRequirementId?: string;
    taskId: string;
  };
  displayMode: WorkflowTaskDisplayMode;
  documentRequirements: DocumentRequirementItem[];
  finalActions?: ReactNode;
  onFinalStepChange?: (final: boolean) => void;
  form?: { content: ReactNode; title: string; hideWrapper?: boolean };
  scoring: ScoringConfiguration | null;
  status: WorkflowTaskWorkStatus;
};

function RequiredMark({ required }: { required: boolean }) {
  return required ? <span className="ml-1 text-brand-orange">*</span> : null;
}

function ChecklistContent({
  disabled,
  items,
}: {
  disabled: boolean;
  items: ChecklistConfigurationItem[];
}) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <section
          className="rounded-xl border border-brand-navy/10 bg-white p-5"
          key={item.code}
        >
          <Input name={`items.${index}.code`} type="hidden" value={item.code} />
          <CheckboxField
            containerClassName="font-semibold text-brand-navy"
            disabled={disabled}
            label={
              <span>
                {item.label}
                <RequiredMark required={item.required} />
              </span>
            }
            name={`items.${index}.accepted`}
          />
          <FormTextarea
            className="min-h-20"
            containerClassName="mt-4"
            disabled={disabled}
            label="Reviewer note (optional)"
            name={`items.${index}.comment`}
            placeholder="Record evidence or a concise review note"
          />
        </section>
      ))}
    </div>
  );
}

function ScoringContent({
  disabled,
  scoring,
}: {
  disabled: boolean;
  scoring: ScoringConfiguration;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-brand-navy/55">
        Aggregation: {scoring.aggregation.replaceAll("_", " ").toLowerCase()}
      </p>
      {scoring.criteria.map((criterion, index) => (
        <section
          className="grid gap-4 rounded-xl border border-brand-navy/10 p-4 md:grid-cols-[1fr_10rem]"
          key={criterion.stableKey}
        >
          <Input
            name={`scores.${index}.criterion`}
            type="hidden"
            value={criterion.stableKey}
          />
          <div>
            <p className="text-sm font-semibold text-brand-navy">
              {criterion.criterion}
            </p>
            {criterion.description ? (
              <p className="mt-1 text-xs text-brand-navy/55">
                {criterion.description}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-brand-navy/55">
              Weight {criterion.weight}
            </p>
          </div>
          <FormInput
            disabled={disabled}
            label={`Score (${criterion.scaleMinimum}–${criterion.scaleMaximum})`}
            max={criterion.scaleMaximum}
            min={criterion.scaleMinimum}
            name={`scores.${index}.score`}
            registrationOptions={{
              setValueAs: (value) => (value === "" ? null : Number(value)),
            }}
            required
            step="any"
            type="number"
          />
          <FormTextarea
            className="min-h-20"
            containerClassName="md:col-span-2"
            disabled={disabled}
            label="Comment"
            name={`scores.${index}.comment`}
            required={criterion.mandatoryComment}
          />
        </section>
      ))}
    </div>
  );
}

function CommentsContent({
  disabled,
  fields,
}: {
  disabled: boolean;
  fields: WorkflowTaskWorkSectionsProps["commentFields"];
}) {
  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.key}>
          <Input
            name={`comments.${index}.key`}
            type="hidden"
            value={field.key}
          />
          <FormTextarea
            className="min-h-24"
            disabled={disabled}
            label={field.label}
            name={`comments.${index}.value`}
            required={field.mandatory}
          />
          {field.helpText ? (
            <p className="mt-1 text-xs text-brand-navy/60">{field.helpText}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function SectionsLayout({
  disabled,
  sections,
}: {
  disabled: boolean;
  sections: TaskWorkSection[];
}) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      {sections.map((section) => (
        <WorkflowTaskPreviewSection
          key={section.id}
          status={section.status}
          title={section.title}
        >
          {section.content}
        </WorkflowTaskPreviewSection>
      ))}
    </fieldset>
  );
}

export function WorkflowTaskWorkSections({
  sectionOrder,
  onSectionOrderChange,
  orderingPending,
  checklistItems,
  commentFields,
  disabled,
  readOnly = false,
  taskId,
  documentUpload,
  displayMode,
  documentRequirements,
  finalActions,
  onFinalStepChange,
  form,
  scoring,
  status,
}: WorkflowTaskWorkSectionsProps) {
  const sections: TaskWorkSection[] = [
    ...(form
      ? [
          {
            content: form.content,
            id: "form" as const,
            status: status.form,
            title: form.title,
          },
        ]
      : []),
    ...(checklistItems.length
      ? [
          {
            content: (
              <ChecklistContent
                disabled={disabled || readOnly}
                items={checklistItems}
              />
            ),
            id: "checklist" as const,
            status: status.checklist,
            title: "Checklist",
          },
        ]
      : []),
    ...(documentRequirements.length
      ? [
          {
            content: (
              <WorkflowTaskDocumentsSection
                disabled={disabled || readOnly}
                taskId={taskId}
                requirements={documentRequirements}
                upload={documentUpload}
              />
            ),
            id: "documents" as const,
            status: status.documents,
            title: "Documents",
          },
        ]
      : []),
    ...(scoring?.criteria.length
      ? [
          {
            content: (
              <ScoringContent disabled={disabled || readOnly} scoring={scoring} />
            ),
            id: "scoring" as const,
            status: status.scoring,
            title: "Scoring",
          },
        ]
      : []),
    ...(commentFields.length
      ? [
          {
            content: (
              <CommentsContent
                disabled={disabled || readOnly}
                fields={commentFields}
              />
            ),
            id: "comments" as const,
            status: status.comments,
            title: "Comments & Recommendations",
          },
        ]
      : []),
  ];

  const orderedSections = orderTaskSections(sections, sectionOrder);
  const formOnly =
    Boolean(form?.hideWrapper) &&
    orderedSections.length === 1 &&
    orderedSections[0].id === "form";
  useEffect(() => {
    if (formOnly) onFinalStepChange?.(true);
  }, [formOnly, onFinalStepChange]);
  if (!orderedSections.length) return null;
  if (formOnly) {
    return (
      <>
        {orderedSections[0].content}
        {finalActions}
      </>
    );
  }
  return displayMode === "SECTIONS" ? (
    <SectionsLayout disabled={disabled} sections={orderedSections} />
  ) : (
    <WorkflowTaskStepLayout
      disabled={disabled}
      finalActions={finalActions}
      onFinalStepChange={onFinalStepChange}
      onSectionOrderChange={onSectionOrderChange}
      orderingPending={orderingPending}
      sections={orderedSections}
    />
  );
}
