import type { AuthenticatedUser } from "@/auth/types";

const workflowInstanceId = "10000000-0000-4000-8000-000000000001";
export const stageInstanceId = "20000000-0000-4000-8000-000000000001";
export const source = {
  actions: [
    {
      actionType: "REJECT",
      condition: null,
      configuration: {
        outcome: { type: "TRANSITION" },
        reversibleActionKey: null,
      },
      displayOrder: 4,
      enabled: true,
      id: "30000000-0000-4000-8000-000000000001",
      label: "Reject",
      reasonRequired: false,
      stableKey: "REJECT",
    },
  ],
  stage: {
    application: {},
    completedAt: null,
    eligibility: {},
    exitCondition: null,
    fundingCall: {},
    rowVersion: 7,
    stageDefinitionId: "40000000-0000-4000-8000-000000000001",
    stageInstanceId,
    stageKey: "ASSESSMENT",
    status: "ACTIVE",
    workflowInstanceId,
    workflowStatus: "ACTIVE",
    workflowVersionId: "50000000-0000-4000-8000-000000000001",
  },
  task: null,
};
export const input = {
  sourceStageInstanceId: stageInstanceId,
  workflowInstanceId,
};

export function actor(...permissions: string[]) {
  return {
    capabilities: new Set(permissions),
    id: "60000000-0000-4000-8000-000000000001",
    status: "active",
  } as unknown as AuthenticatedUser;
}
