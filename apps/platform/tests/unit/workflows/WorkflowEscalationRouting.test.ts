import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({
    buildWorkflowActionConditionContext: vi.fn(async () => ({
      application: {},
      eligibility: {},
      fundingCall: {},
      stages: [],
    })),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    loadSequentialTransitions: vi.fn(async () => ({
      actionExists: true,
      transitions: [],
    })),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({
    configuredActionTargetsAreValid: vi.fn(async () => true),
  }),
);

import { prepareWorkflowActionRouting } from "@/modules/workflows/application/runtime/ServerWorkflowActionRoutingService";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { target } from "./WorkflowActionExecutionFixtures";

it.each(["ROLE", "USER"] as const)(
  "validates the selected %s rather than the workflow default",
  async (targetType) => {
    const targetId = "10000000-0000-4000-8000-000000000001";
    const runtime = {
      ...target,
      action: {
        ...target.action,
        actionType: "ESCALATE" as const,
        condition: null,
        configuration: {
          blockUntilResolved: true,
          responsibility: "TRANSFER" as const,
          targetType: "ROLE" as const,
          targetId: "20000000-0000-4000-8000-000000000001",
          trigger: "MANUAL" as const,
        },
      },
    };
    const result = await prepareWorkflowActionRouting({} as never, runtime, {
      actionType: "ESCALATE",
      targetType,
      targetId,
    });
    expect(result.targetsValid).toBe(true);
    expect(configuredActionTargetsAreValid).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({
        action: expect.objectContaining({
          configuration: expect.objectContaining({ targetType, targetId }),
        }),
      }),
    );
    expect(runtime.action.configuration.targetId).toBe(
      "20000000-0000-4000-8000-000000000001",
    );
  },
);
