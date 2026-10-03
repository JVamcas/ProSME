import type { AuthenticatedUser } from "@/auth/types";

export const actorId = "10000000-0000-4000-8000-000000000001";
export const workflowInstanceId = "20000000-0000-4000-8000-000000000001";
export const stageInstanceId = "30000000-0000-4000-8000-000000000001";
export const taskId = "40000000-0000-4000-8000-000000000001";
export const input = {
  actionKey: "ADVANCE",
  correlationId: "50000000-0000-4000-8000-000000000001",
  expectedRuntimeVersion: 2,
  idempotencyKey: "60000000-0000-4000-8000-000000000001",
  input: { actionType: "APPROVE_ADVANCE" as const },
  sourceStageInstanceId: stageInstanceId,
  taskId,
  workflowInstanceId,
};
export const target = {
  action: {
    actionType: "APPROVE_ADVANCE" as const,
    condition: null,
    configuration: {},
    displayOrder: 1,
    enabled: true,
    id: "70000000-0000-4000-8000-000000000001",
    label: "Advance",
    reasonCodeRequired: false,
    stableKey: "ADVANCE",
  },
  stage: {
    application: {},
    completedAt: null,
    eligibility: {},
    exitCondition: null,
    fundingCall: {},
    rowVersion: 2,
    stageDefinitionId: "80000000-0000-4000-8000-000000000001",
    stageInstanceId,
    stageKey: "SCREENING",
    status: "ACTIVE" as const,
    workflowInstanceId,
    workflowVersionId: "90000000-0000-4000-8000-000000000001",
  },
  task: {
    assignedToActor: true,
    id: taskId,
    permissions: {
      decide: "workflow.task.assigned.decide" as const,
      edit: "workflow.task.assigned.process" as const,
      view: "workflow.task.assigned.read" as const,
      visibility: "INTERNAL_ONLY" as const,
    },
    prerequisitesComplete: true,
    rowVersion: 5,
    status: "IN_PROGRESS",
  },
};

export function user(capabilities = ["workflow.task.assigned.decide"]) {
  return {
    capabilities: new Set(capabilities),
    id: actorId,
    status: "active",
  } as unknown as AuthenticatedUser;
}

