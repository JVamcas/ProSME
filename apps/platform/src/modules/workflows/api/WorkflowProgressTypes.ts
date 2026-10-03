import type { WorkflowCompletionRequirements } from "./WorkflowCompletionRequirementsTypes";
import type { WorkflowGraphInput } from "../domain/definitions/WorkflowTypes";
import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import type { WorkflowInstanceStatus } from "../domain/runtime/WorkflowInstance";
import type { WorkflowTaskType } from "../domain/definitions/WorkflowTaskDefinition";

export type WorkflowProgressTask = {
  actionedAt: string | null;
  assignedRoleName: string | null;
  assignedUserEmail: string | null;
  assignedUserName: string | null;
  canOpen: boolean;
  blockedReason?: string | null;
  dueAt: string | null;
  id: string;
  name: string;
  required: boolean;
  status: string;
  taskType: WorkflowTaskType;
  planned?: boolean;
  configuredReviewerCount?: number;
};

export type WorkflowProgressStage = {
  activatedAt: string | null;
  completedAt: string | null;
  description: string;
  id: string | null;
  iterationNumber: number | null;
  name: string;
  sequence: number;
  stableKey: string;
  returnedAt?: string | null;
  status: StageInstanceStatus | "RETURNED";
  tasks: WorkflowProgressTask[];
  completionRequirements?: WorkflowCompletionRequirements | null;
};

export type WorkflowTakenPath = {
  transitionId: string;
  targetStageKey: string | null;
};

export type WorkflowProgressView = {
  completedAt: string | null;
  graph: WorkflowGraphInput | null;
  id: string;
  name: string;
  stages: WorkflowProgressStage[];
  startedAt: string;
  status: WorkflowInstanceStatus;
  terminalOutcome: string | null;
  takenPaths: WorkflowTakenPath[];
  versionNumber: number;
};
