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

export function workflowProgressStageStatusLabel(
  stage: WorkflowProgressStage,
): string {
  if (stage.processingStatus === "ON_HOLD") return "On hold";
  const heldTasks = stage.tasks.filter(
    (task) => task.processingStatus === "ON_HOLD",
  ).length;
  return `${workflowProgressStatusLabels[stage.status]}${heldTasks ? ` · ${heldTasks} task(s) on hold` : ""}`;
}
