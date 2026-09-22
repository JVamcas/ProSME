import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository",
  () => ({
    readWorkflowActionAvailabilitySource: vi.fn(),
    workflowActionAvailabilityDatabase: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({ configuredActionTargetsAreValid: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({ loadSequentialTransitions: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({ buildWorkflowActionConditionContext: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import {
  readWorkflowActionAvailabilitySource,
  workflowActionAvailabilityDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

const workflowInstanceId = "10000000-0000-4000-8000-000000000001";
const stageInstanceId = "20000000-0000-4000-8000-000000000001";
const source = {
  actions: [{
    actionType: "REJECT",
    condition: null,
    configuration: { reasonCodes: ["INELIGIBLE", "INCOMPLETE"] },
    displayOrder: 4,
    enabled: true,
    id: "30000000-0000-4000-8000-000000000001",
    label: "Reject",
    reasonCodeRequired: true,
    stableKey: "REJECT",
  }],
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
const input = { sourceStageInstanceId: stageInstanceId, workflowInstanceId };

function actor(...permissions: string[]) {
  return {
    capabilities: new Set(permissions),
    id: "60000000-0000-4000-8000-000000000001",
    status: "active",
  } as unknown as AuthenticatedUser;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue(
    source as never,
  );
  vi.mocked(workflowActionAvailabilityDatabase).mockReturnValue({} as never);
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(true);
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [],
  });
  vi.mocked(buildWorkflowActionConditionContext).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  });
});

describe("workflow action availability service", () => {
  it("returns configuration-driven presentation and required inputs", async () => {
    const result = await getWorkflowActionAvailability(
      actor(
        permissionCodes.workflowTaskAllRead,
        permissionCodes.workflowTaskAssignedDecide,
      ),
      input,
    );

    expect(result).toEqual([expect.objectContaining({
      actionType: "REJECT",
      available: true,
      key: "REJECT",
      label: "Reject",
      presentation: { displayOrder: 4, variant: "danger" },
      requiredInput: expect.objectContaining({
        confirmation: {
          message: "Confirm this rejection decision.",
          required: true,
        },
        reasonCode: {
          options: ["INELIGIBLE", "INCOMPLETE"],
          required: true,
        },
      }),
      runtimeVersion: 7,
      unavailableReason: null,
    })]);
  });

  it("returns a safe actor-specific denial without evaluating conditions", async () => {
    const result = await getWorkflowActionAvailability(
      actor(permissionCodes.workflowTaskAllRead),
      input,
    );

    expect(result).toEqual([expect.objectContaining({
      available: false,
      unavailableReason: "This action is not available to you.",
    })]);
    expect(buildWorkflowActionConditionContext).not.toHaveBeenCalled();
    expect(loadSequentialTransitions).not.toHaveBeenCalled();
  });
});
