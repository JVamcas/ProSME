import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowHoldRepository", () => ({
  readApplicableWorkflowHolds: vi.fn(),
}));
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

import { readApplicableWorkflowHolds } from "@/modules/workflows/infrastructure/WorkflowHoldRepository";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import {
  readWorkflowActionAvailabilitySource,
  workflowActionAvailabilityDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

import {
  actor,
  input,
  source,
  stageInstanceId,
} from "../../support/WorkflowActionAvailabilityFixture";

beforeEach(() => {
  vi.clearAllMocks();
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

describe("workflow hold action availability", () => {
  it.each([
    ["TASK", true],
    ["STAGE", true],
    ["APPLICATION", true],
    ["TASK", false],
  ] as const)(
    "returns hold and resume availability for %s scope (held: %s)",
    async (scope, held) => {
      const taskId = "70000000-0000-4000-8000-000000000001";
      const hold = {
        id: "80000000-0000-4000-8000-000000000001",
        scope,
        taskId: scope === "TASK" ? taskId : null,
        stageInstanceId,
        workflowInstanceId: input.workflowInstanceId,
        heldAt: "2026-10-04T08:00:00Z",
        heldBy: "Reviewer",
        reason: "Awaiting evidence",
        reviewAt: null,
      };
      vi.mocked(readApplicableWorkflowHolds).mockResolvedValue(held ? [hold] : []);
      vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
        ...source,
        actions: [
          {
            ...source.actions[0],
            actionType: "PUT_ON_HOLD",
            stableKey: "PUT_ON_HOLD",
            configuration: { scope: "STAGE", reviewDateRequired: false },
          },
          {
            ...source.actions[0],
            actionType: "RESUME",
            stableKey: "RESUME",
            configuration: { scope: "STAGE" },
          },
        ],
        stage: { ...source.stage, activeHold: held && scope !== "TASK" },
        task: {
          id: taskId,
          assignedToActor: true,
          activeHold: held,
          permissions: defaultWorkflowElementPermissions,
          status: "IN_PROGRESS",
          taskType: "STAGE_DECISION",
        },
      } as never);
      const result = await getWorkflowActionAvailability(
        actor(
          permissionCodes.workflowTaskAssignedRead,
          permissionCodes.workflowTaskAssignedProcess,
          permissionCodes.workflowTaskAssignedHold,
          permissionCodes.workflowStageAllHold,
          permissionCodes.workflowInstanceAllHold,
          permissionCodes.workflowTaskAssignedResume,
          permissionCodes.workflowStageAllResume,
          permissionCodes.workflowInstanceAllResume,
        ),
        { ...input, taskId },
      );

      expect(result[0]).toMatchObject({
        available: !held,
        unavailableReason: held
          ? "This work is already on hold. Resume the applicable holds first."
          : null,
      });
      expect(result[1]).toMatchObject({
        available: held,
        requiredInput: { resumableHolds: held ? [hold] : [] },
      });
    },
  );
});
