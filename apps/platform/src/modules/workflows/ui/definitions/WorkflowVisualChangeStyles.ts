import type { WorkflowTransitionInput } from "../../domain/definitions/WorkflowTypes";

export type WorkflowVisualRouteStatus = "deleted" | "suggested" | "created";

export type WorkflowVisualRouteStatusResolver = (
  transition: WorkflowTransitionInput,
  destinationKey?: string,
) => WorkflowVisualRouteStatus;

export const workflowVisualChangeStyles = {
  deleted: {
    label: "Will be deleted",
    color: "#dc2626",
    badge: "border-red-300 bg-red-50 text-red-800",
    dashed: false,
  },
  suggested: {
    label: "Suggested · select to create",
    color: "#059669",
    badge: "border-dashed border-emerald-300 bg-white text-emerald-800",
    dashed: true,
  },
  created: {
    label: "Will be created",
    color: "#059669",
    badge: "border-emerald-400 bg-emerald-50 text-emerald-900",
    dashed: false,
  },
} as const;
