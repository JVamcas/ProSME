import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import type { WorkflowInstanceStatus } from "../domain/runtime/WorkflowInstance";

export type WorkflowProgressTask = {
  actionedAt: string | null;
  assignedRoleName: string | null;
  assignedUserEmail: string | null;
  assignedUserName: string | null;
  canOpen: boolean;
  dueAt: string | null;
  id: string;
  name: string;
  required: boolean;
  status: string;
};

export type WorkflowProgressStage = {
  activatedAt: string | null;
  completedAt: string | null;
  description: string;
  id: string | null;
  iterationNumber: number | null;
  name: string;
  sequence: number;
  status: StageInstanceStatus;
  tasks: WorkflowProgressTask[];
};

export type WorkflowProgressView = {
  completedAt: string | null;
  id: string;
  name: string;
  stages: WorkflowProgressStage[];
  startedAt: string;
  status: WorkflowInstanceStatus;
  terminalOutcome: string | null;
  versionNumber: number;
};
