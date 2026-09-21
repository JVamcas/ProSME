import type { WorkflowTaskStatus } from "./WorkflowTask";

const taskTransitions: Readonly<
  Record<WorkflowTaskStatus, readonly WorkflowTaskStatus[]>
> = {
  PENDING: ["CLAIMED", "CANCELLED"],
  CLAIMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionWorkflowTask(
  currentStatus: WorkflowTaskStatus,
  targetStatus: WorkflowTaskStatus,
): boolean {
  return taskTransitions[currentStatus].includes(targetStatus);
}

export function isTerminalWorkflowTaskStatus(
  status: WorkflowTaskStatus,
): boolean {
  return taskTransitions[status].length === 0;
}
