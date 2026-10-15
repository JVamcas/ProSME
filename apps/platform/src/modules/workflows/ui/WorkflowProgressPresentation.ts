import type { WorkflowProgressStage } from "../api/WorkflowProgressTypes";

export const workflowProgressStatusLabels: Record<
  WorkflowProgressStage["status"],
  string
> = {
  ACTIVE: "In progress",
  BLOCKED: "Blocked",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
  NOT_STARTED: "Waiting",
  RETURNED: "Returned for correction",
};

export const workflowProgressStatusBackgrounds: Record<
  WorkflowProgressStage["status"],
  string
> = {
  ACTIVE: "bg-brand-blue/10 hover:bg-brand-blue/15",
  BLOCKED: "bg-brand-orange/10 hover:bg-brand-orange/15",
  CANCELLED: "bg-slate-100 hover:bg-slate-200",
  COMPLETED: "bg-brand-green/10 hover:bg-brand-green/15",
  NOT_STARTED: "bg-slate-50 hover:bg-slate-100",
  RETURNED: "bg-brand-orange/10 hover:bg-brand-orange/15",
};

export const workflowProgressStatusTextColors: Record<
  WorkflowProgressStage["status"],
  string
> = {
  ACTIVE: "text-brand-blue",
  BLOCKED: "text-brand-navy/60",
  CANCELLED: "text-brand-navy/60",
  COMPLETED: "text-brand-green",
  NOT_STARTED: "text-slate-500",
  RETURNED: "text-brand-orange",
};

export function workflowProgressStageStatusLabel(
  stage: WorkflowProgressStage,
): string {
  if (stage.processingStatus === "ON_HOLD") return "On hold";
  const heldTasks = stage.tasks.filter(
    (task) => task.processingStatus === "ON_HOLD",
  ).length;
  return `${workflowProgressStatusLabels[stage.status]}${heldTasks ? ` · ${heldTasks} task(s) on hold` : ""}`;
}
