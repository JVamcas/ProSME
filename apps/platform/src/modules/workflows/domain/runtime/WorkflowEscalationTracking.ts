import type { WorkflowActionAvailability } from "../actions/WorkflowActionAvailability";

export type WorkflowEscalationTracking = {
  id: string;
  taskId: string;
  taskName: string;
  stageName: string;
  rowVersion: number;
  assignedUserName: string | null;
  assignedRoleName: string | null;
  canCancel: boolean;
  actions: WorkflowActionAvailability[];
};
