import type { WorkflowTaskType } from "../domain/definitions/WorkflowTaskDefinition";

export const workflowTaskTypeLabels: Record<WorkflowTaskType, string> = {
  CONTRIBUTING: "Contributing",
  STAGE_DECISION: "Stage decision",
};
