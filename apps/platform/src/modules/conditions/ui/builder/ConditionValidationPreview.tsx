import { Badge } from "@/shared/ui/Badge";

import type { ConditionValidationResult } from "../../engine/ConditionValidation";

export function ConditionValidationPreview({
  preview,
  validation,
}: {
  preview: string;
  validation: ConditionValidationResult;
}) {
  return (
    <section
      aria-labelledby="condition-preview-heading"
      className="mt-4 rounded-2xl border border-brand-navy/15 bg-brand-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          className="font-semibold text-brand-navy"
          id="condition-preview-heading"
        >
          Condition preview
        </h3>
        <Badge variant={validation.valid ? "success" : "danger"}>
          {validation.valid
            ? "Valid"
            : `${validation.issues.length} validation ${validation.issues.length === 1 ? "issue" : "issues"}`}
        </Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-brand-navy" role="status">
        {preview}
      </p>
      {validation.valid ? null : (
        <ul className="mt-3 space-y-1 text-sm text-red-700" role="alert">
          {validation.issues.map((issue, index) => (
            <li key={`${issue.nodeId}:${issue.code}:${index}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
