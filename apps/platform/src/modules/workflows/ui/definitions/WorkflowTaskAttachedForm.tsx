"use client";

import Link from "next/link";
import { useContext } from "react";
import type { PublishedFormOption } from "@/modules/forms/FormTypes";
import type { WorkflowTaskInput } from "../../domain/definitions/WorkflowTypes";
import { workflowTaskInheritsEligibilityForm } from "../../domain/definitions/WorkflowEligibilityForm";
import {
  WorkflowSearchContext,
  WorkflowSearchTarget,
} from "./search/WorkflowSearchTarget";
import { WorkflowFormSearchOutline } from "./search/WorkflowFormSearchOutline";

export function WorkflowTaskAttachedForm({
  task,
  forms,
  pending,
  error,
}: {
  task: WorkflowTaskInput;
  forms?: PublishedFormOption[];
  pending: boolean;
  error: boolean;
}) {
  const {
    forms: searchForms,
    selected,
    stageKey,
  } = useContext(WorkflowSearchContext);
  const versionId = task.formBinding?.formVersionId;
  const form = forms?.find((item) => item.versionId === versionId);
  const content = searchForms?.find((item) => item.versionId === versionId);
  const definitionId = form?.definitionId ?? content?.definitionId;
  const name = form?.formName ?? content?.name;
  const version = form?.versionNumber ?? content?.versionNumber;
  const matchingForm =
    selected?.tab === "forms" &&
    selected.stageKey === stageKey &&
    selected.taskKey === task.stableKey;

  let label = "No form attached";
  if (versionId) {
    label = pending
      ? "Loading…"
      : error
        ? "Unable to load form"
        : "Form unavailable";
  } else if (workflowTaskInheritsEligibilityForm(task)) {
    label = "From funding call";
  }

  return (
    <div className="min-w-40 max-w-sm whitespace-normal">
      <WorkflowSearchTarget
        tab="forms"
        itemKey="$form"
        taskKey={task.stableKey}
      >
        {definitionId && versionId ? (
          <Link
            className="text-brand-navy underline underline-offset-2 hover:text-brand-orange"
            href={`/admin/settings/forms/${definitionId}?versionId=${versionId}`}
          >
            {name ?? "Attached form"}
            {version ? ` · Version ${version}` : ""}
          </Link>
        ) : (
          <span className="text-brand-navy/65">{label}</span>
        )}
      </WorkflowSearchTarget>
      {matchingForm && content ? (
        <WorkflowFormSearchOutline form={content} taskKey={task.stableKey} />
      ) : null}
    </div>
  );
}
