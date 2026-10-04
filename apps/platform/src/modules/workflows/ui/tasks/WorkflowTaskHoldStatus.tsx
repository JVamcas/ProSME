import { ChevronDown } from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import {
  workflowHoldScopeLabels,
  type WorkflowHoldSummary,
} from "../../domain/runtime/WorkflowHold";

export function WorkflowTaskHoldStatus({
  holds,
}: {
  holds: readonly WorkflowHoldSummary[];
}) {
  if (!holds.length) return null;
  return (
    <details className="group rounded-lg border border-brand-orange/30 bg-brand-orange/5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg p-4 font-semibold text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange [&::-webkit-details-marker]:hidden">
        <span>On hold · SLA paused</span>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-3 px-4 pb-4">
        {holds.map((hold) => (
          <div className="text-sm text-brand-navy/75" key={hold.id}>
            <p>
              {workflowHoldScopeLabels[hold.scope]} · Placed by {hold.heldBy}
            </p>
            {hold.reason ? (
              <p className="mt-1 whitespace-pre-wrap">{hold.reason}</p>
            ) : null}
            <p className="mt-1">
              {hold.reviewAt
                ? `Automatic resumption: ${formatLocalDateTime24(hold.reviewAt)}`
                : "Manual resumption required"}
            </p>
          </div>
        ))}
      </div>
    </details>
  );
}
