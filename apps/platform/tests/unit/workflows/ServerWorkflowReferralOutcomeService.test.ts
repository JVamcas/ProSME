import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerApplicationWithdrawalService", () => ({
  withdrawFromWorkflowAction: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository",
  () => ({ recordWorkflowActionExecution: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowDecisionRepository",
  () => ({ recordWorkflowDecision: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerRejectWorkflowActionService",
  () => ({ executeTerminalRejectInTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerSequentialTransitionService",
  () => ({ executeSequentialTransitionInTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageActivationService",
  () => ({ activateStageInTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowControlRepository",
  () => ({
    hasActiveWorkflowReferral: vi.fn(),
    recordWorkflowReferral: vi.fn(),
    recordWorkflowRework: vi.fn(),
    resumeWorkflowHold: vi.fn(),
    startWorkflowHold: vi.fn(),
  }),
);

import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { executeConfiguredWorkflowActionOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowActionOutcomeService";
import {
  hasActiveWorkflowReferral,
  recordWorkflowReferral,
} from "@/modules/workflows/infrastructure/WorkflowControlRepository";

const sourceStageId = "10000000-0000-4000-8000-000000000001";
const referredStageId = "20000000-0000-4000-8000-000000000001";
const taskId = "30000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hasActiveWorkflowReferral).mockResolvedValue(false);
  vi.mocked(activateStageInTransaction).mockResolvedValue({
    kind: "activated",
    stageInstanceId: referredStageId,
    taskIds: ["40000000-0000-4000-8000-000000000001"],
  });
});

describe("workflow referral outcome", () => {
  it("creates independent referred work and preserves its exact origin", async () => {
    const result = await executeConfiguredWorkflowActionOutcome({} as never, {
      actorId: "50000000-0000-4000-8000-000000000001",
      command: {
        actionKey: "REFER_SPECIALIST",
        correlationId: "60000000-0000-4000-8000-000000000001",
        expectedRuntimeVersion: 2,
        idempotencyKey: "70000000-0000-4000-8000-000000000001",
        input: {
          actionType: "REFER",
          question: "Please provide a specialist risk opinion.",
        },
        sourceStageInstanceId: sourceStageId,
        taskId,
        workflowInstanceId: "80000000-0000-4000-8000-000000000001",
      },
      conditions: {
        actionEvaluation: { evaluation: null, passed: true, resolutionError: null },
        available: true,
        selectedTransitionId: "90000000-0000-4000-8000-000000000001",
        transitionEvaluations: [],
      },
      conditionContext: undefined,
      configuredTransitions: {
        actionExists: true,
        transitions: [{
          condition: null,
          id: "90000000-0000-4000-8000-000000000001",
          priority: 1,
          targetStages: [{
            id: "a0000000-0000-4000-8000-000000000001",
            name: "Specialist review",
          }],
          terminalOutcome: null,
        }],
      },
      resultingRuntimeVersion: 3,
      target: {
        action: {
          actionType: "REFER",
          condition: null,
          configuration: {
            returnToReferrer: true,
            sourceTaskBehavior: "BLOCKED",
          },
          displayOrder: 1,
          enabled: true,
          id: "b0000000-0000-4000-8000-000000000001",
          label: "Refer",
          reasonCodeRequired: false,
          stableKey: "REFER_SPECIALIST",
        },
        stage: {
          application: {},
          completedAt: null,
          eligibility: {},
          exitCondition: null,
          fundingCall: {},
          rowVersion: 2,
          stageDefinitionId: "c0000000-0000-4000-8000-000000000001",
          stageInstanceId: sourceStageId,
          stageKey: "ASSESSMENT",
          status: "ACTIVE",
          workflowInstanceId: "80000000-0000-4000-8000-000000000001",
          workflowVersionId: "d0000000-0000-4000-8000-000000000001",
        },
        task: {
          assignedToActor: true,
          id: taskId,
          permissions: {
            decide: "workflow.task.assigned.decide",
            edit: "workflow.task.assigned.process",
            view: "workflow.task.assigned.read",
            visibility: "INTERNAL_ONLY",
          },
          prerequisitesComplete: true,
          rowVersion: 1,
          status: "IN_PROGRESS",
        },
      },
    });

    expect(result.transition).toMatchObject({
      kind: "STAGE_ACTIVE",
      targets: [{ targetStageInstanceId: referredStageId }],
    });
    expect(activateStageInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        iterationStrategy: "NEXT",
        referralContext: expect.objectContaining({
          sourceStageInstanceId: sourceStageId,
          sourceTaskId: taskId,
        }),
      }),
    );
    expect(recordWorkflowReferral).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        referredStageInstanceId: referredStageId,
        sourceTaskBehavior: "BLOCKED",
        sourceTaskId: taskId,
      }),
    );
  });
});
