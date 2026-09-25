"use client";

import { ChevronDown, FileText } from "lucide-react";
import type { ReactNode } from "react";

import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowTaskReviewSummary } from "@/modules/workflows/ui/WorkflowTaskReviewLayout";

export function WorkflowTaskPreviewSummary({
  requiredCount,
  sectionCount,
}: {
  requiredCount: number;
  sectionCount: number;
}) {
  return (
    <WorkflowTaskReviewSummary
      completedCount={0}
      message={requiredCount
        ? `0 of ${requiredCount} required items complete`
        : `${sectionCount} configured sections`}
      status="Not started"
      totalCount={requiredCount}
    />
  );
}

export function WorkflowTaskPreviewSection({
  children,
  defaultOpen = false,
  status,
  title,
}: {
  children?: ReactNode;
  defaultOpen?: boolean;
  status: string;
  title: string;
}) {
  return (
    <details
      className="group overflow-hidden rounded-2xl border border-brand-navy/10 bg-brand-white"
      open={defaultOpen || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-brand-navy">
        <span className="font-bold">{title}</span>
        <span className="flex items-center gap-3 text-sm text-brand-navy/60">
          {status}
          <ChevronDown className="size-4 transition group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-brand-navy/10 p-5">{children}</div>
    </details>
  );
}

function ChecklistResponse({
  name,
  responseType,
}: {
  name: string;
  responseType: WorkflowStageInput["checklistItems"][number]["responseType"];
}) {
  if (responseType === "YES_NO") {
    return (
      <div className="flex gap-4 text-sm text-brand-navy/65">
        <label><input disabled name={name} type="radio" /> Yes</label>
        <label><input disabled name={name} type="radio" /> No</label>
      </div>
    );
  }
  return (
    <input
      className="h-10 w-full rounded-lg border border-brand-navy/20 bg-brand-white px-3"
      disabled
      type={responseType === "TEXT" ? "text" : responseType.toLowerCase()}
    />
  );
}

export function WorkflowChecklistPreview({ stage }: { stage: WorkflowStageInput }) {
  return (
    <div className="space-y-3">
      {[...stage.checklistItems]
        .sort((left, right) => left.displayOrder - right.displayOrder)
        .map((item) => (
          <div
            className="space-y-3 rounded-xl border border-brand-navy/10 p-4"
            key={item.key}
          >
            <div>
              <p className="text-sm font-semibold text-brand-navy">
                {item.text}
                {item.mandatory ? (
                  <span className="ml-1 text-brand-orange">*</span>
                ) : null}
              </p>
              {item.notes ? (
                <p className="mt-1 text-xs text-brand-navy/55">{item.notes}</p>
              ) : null}
            </div>
            <ChecklistResponse
              name={`checklist-${item.key}`}
              responseType={item.responseType}
            />
            {item.evidenceRequirement !== "NONE" ? (
              <p className="text-xs text-brand-navy/55">
                Evidence: {item.evidenceRequirement.toLowerCase()}
              </p>
            ) : null}
          </div>
        ))}
    </div>
  );
}

export function WorkflowDocumentRequirementsPreview({
  stage,
  taskStableKey,
}: {
  stage: WorkflowStageInput;
  taskStableKey: string;
}) {
  return (
    <div className="space-y-3">
      {stage.documentRequirements
        .filter((requirement) => requirement.taskStableKey === taskStableKey)
        .map((requirement) => (
        <div
          className="flex items-start gap-3 rounded-xl border border-brand-navy/10 p-4"
          key={requirement.name}
        >
          <FileText className="mt-0.5 size-5 shrink-0 text-brand-orange" />
          <div>
            <p className="text-sm font-semibold text-brand-navy">
              {requirement.name}
              {requirement.mandatory ? (
                <span className="ml-1 text-brand-orange">*</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-brand-navy/55">
              {requirement.acceptedFileTypes.join(", ")} · Maximum {requirement.maximumSizeMb} MB
            </p>
            <p className="mt-1 text-xs text-brand-navy/55">
              Uploaded by {requirement.uploader.replaceAll("_", " ").toLowerCase()}; verified by {requirement.verifier.replaceAll("_", " ").toLowerCase()}.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WorkflowScoringPreview({ stage }: { stage: WorkflowStageInput }) {
  if (!stage.scoring) return null;
  return (
    <div className="space-y-3">
      <p className="text-xs text-brand-navy/55">
        Aggregation: {stage.scoring.aggregation.replaceAll("_", " ").toLowerCase()}
      </p>
      {stage.scoring.criteria.map((criterion) => (
        <div
          className="grid gap-4 rounded-xl border border-brand-navy/10 p-4 md:grid-cols-[1fr_10rem]"
          key={criterion.criterion}
        >
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
          <label className="text-xs font-semibold text-brand-navy">
            Score ({criterion.scaleMinimum}–{criterion.scaleMaximum})
            <input
              className="mt-1 h-10 w-full rounded-lg border border-brand-navy/20 px-3"
              disabled
              max={criterion.scaleMaximum}
              min={criterion.scaleMinimum}
              type="number"
            />
          </label>
          {criterion.mandatoryComment ? (
            <label className="text-xs font-semibold text-brand-navy md:col-span-2">
              Comment <span className="text-brand-orange">*</span>
              <textarea
                className="mt-1 min-h-20 w-full rounded-lg border border-brand-navy/20 p-3"
                disabled
              />
            </label>
          ) : null}
        </div>
      ))}
    </div>
  );
}
