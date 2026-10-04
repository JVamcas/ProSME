"use client";

import { useFormContext, useWatch } from "react-hook-form";

import type { WorkflowStageInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowStageFormInput } from "./WorkflowStageFormSchema";

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-brand-navy">{value}</dd>
    </div>
  );
}

type Props = {
  coiFormItems: readonly { label: string; value: string }[];
  stages: readonly WorkflowStageInput[];
};

export function WorkflowStageReviewStep({ coiFormItems, stages }: Props) {
  const { control } = useFormContext<WorkflowStageFormInput>();
  const values = useWatch({ control });
  const predecessorNames = stages
    .filter((stage) =>
      values.joinPredecessorStageKeys?.includes(stage.stableKey),
    )
    .map((stage) => stage.name);
  const coiForm = coiFormItems.find(
    (item) => item.value === values.coiFormVersionId,
  );

  return (
    <section aria-label="Review stage" className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-brand-navy">
          Review stage configuration
        </h3>
        <p className="mt-1 text-sm text-brand-navy/60">
          Confirm the stage details and rules before saving.
        </p>
      </div>
      <dl className="grid gap-4 rounded-xl border border-brand-navy/10 bg-brand-navy/[0.02] p-4 sm:grid-cols-2">
        <SummaryItem label="Stage name" value={values.name ?? ""} />
        <SummaryItem
          label="Status"
          value={values.enabled ? "Enabled" : "Disabled"}
        />
        <div className="sm:col-span-2">
          <SummaryItem
            label="Description"
            value={values.description || "No description"}
          />
        </div>
        <SummaryItem
          label="Applicant status"
          value={values.publicStatusMapping?.status?.replaceAll("_", " ") ?? ""}
        />
        <SummaryItem
          label="Applicant status label"
          value={values.publicStatusMapping?.label ?? ""}
        />
        <div className="sm:col-span-2">
          <SummaryItem
            label="Applicant status description"
            value={values.publicStatusMapping?.description ?? ""}
          />
        </div>
        <SummaryItem
          label="Optional"
          value={values.optional ? "Yes" : "No"}
        />
        <SummaryItem
          label="Repeatable"
          value={values.repeatable ? "Yes" : "No"}
        />
        <SummaryItem
          label="Applicant withdrawal"
          value={values.allowApplicantWithdrawal ? "Allowed" : "Not allowed"}
        />
        <div className="sm:col-span-2">
          <SummaryItem
            label="Conflict-of-interest review"
            value={
              values.coiGated
                ? coiForm?.label ?? "Configured"
                : "Not required"
            }
          />
        </div>
        <div className="sm:col-span-2">
          <SummaryItem
            label="Entry prerequisites"
            value={predecessorNames.join(", ") || "No join prerequisites"}
          />
        </div>
        <SummaryItem
          label="Entry condition"
          value={values.entryCondition ? "Configured" : "No condition"}
        />
        <SummaryItem
          label="Exit condition"
          value={values.exitCondition ? "Configured" : "No condition"}
        />
      </dl>
    </section>
  );
}
