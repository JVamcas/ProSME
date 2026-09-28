import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  MessageSquareText,
} from "lucide-react";

import { formatLocalDateTime24 } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/Badge";
import type { WorkflowRfiSummary } from "../../domain/runtime/WorkflowRfiView";
import { WorkflowRfiSummaryContent } from "./WorkflowRfiSummaryContent";

function RequestStatus({ request }: { request: WorkflowRfiSummary }) {
  const presentation = (() => {
    if (request.status === "OPEN" && request.isOverdue) {
      return {
        className: "bg-red-50 text-red-700",
        Icon: CircleAlert,
        label: "Overdue",
      };
    }

    switch (request.status) {
      case "OPEN":
        return {
          className: "bg-amber-50 text-amber-700",
          Icon: Clock3,
          label: "Pending",
        };
      case "RESPONDED":
        return {
          className: "bg-brand-blue/15 text-brand-navy",
          Icon: MessageSquareText,
          label: "Response received",
        };
      case "CLOSED":
        return {
          className: "bg-brand-green/15 text-emerald-800",
          Icon: CheckCircle2,
          label: "Completed",
        };
      case "EXPIRED":
        return {
          className: "bg-red-50 text-red-700",
          Icon: CircleAlert,
          label: "Expired",
        };
    }
  })();

  return (
    <Badge
      className={cn(
        "w-fit px-3 py-1.5",
        presentation.className,
      )}
    >
      <presentation.Icon aria-hidden="true" className="size-4" />
      {presentation.label}
    </Badge>
  );
}

export function WorkflowRfiRequestListItem({
  isSelected,
  onSelect,
  request,
}: {
  isSelected: boolean;
  onSelect: () => void;
  request: WorkflowRfiSummary;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "group w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition",
        "hover:-translate-y-0.5 hover:border-brand-orange/45 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2",
        isSelected
          ? "border-brand-orange bg-brand-cream/45 ring-1 ring-brand-orange/15"
          : "border-brand-navy/10",
      )}
      onClick={onSelect}
      type="button"
    >
      <span className="flex items-start gap-4">
        <span
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-2xl transition-colors",
            isSelected
              ? "bg-brand-orange/15 text-brand-orange"
              : "bg-brand-blue/10 text-brand-navy group-hover:bg-brand-orange/10 group-hover:text-brand-orange",
          )}
        >
          <MessageSquareText aria-hidden="true" className="size-6" />
        </span>

        <span className="min-w-0 flex-1">
          <WorkflowRfiSummaryContent
            className="line-clamp-2 text-sm leading-5 text-brand-navy"
            request={request}
          />
          <span className="mt-1.5 block text-xs text-brand-navy/55">
            Created {formatLocalDateTime24(request.createdAt)}
          </span>
          <span className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <RequestStatus request={request} />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-orange">
              {isSelected ? "Selected" : "View request"}
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </span>
          </span>
        </span>
      </span>
    </button>
  );
}
