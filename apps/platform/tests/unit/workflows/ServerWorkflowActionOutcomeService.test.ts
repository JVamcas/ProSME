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

import { withdrawFromWorkflowAction } from "@/modules/applications/ServerApplicationWithdrawalService";
import { executeConfiguredWorkflowActionOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowActionOutcomeService";
import { executeTerminalRejectInTransaction } from "@/modules/workflows/application/runtime/ServerRejectWorkflowActionService";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { recordWorkflowActionExecution } from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import { recordWorkflowDecision } from "@/modules/workflows/infrastructure/WorkflowDecisionRepository";

const stageInstanceId = "10000000-0000-4000-8000-000000000001";
const workflowInstanceId = "20000000-0000-4000-8000-000000000001";
const transitionId = "30000000-0000-4000-8000-000000000001";
const transition = {
  condition: null,
  id: transitionId,
  priority: 1,
  targetStageDefinitionId: null,
  targetStageName: null,
  terminalOutcome: "REJECTED_INCOMPLETE",
};
const command = {
  actionKey: "REJECT",
  correlationId: "40000000-0000-4000-8000-000000000001",
  expectedRuntimeVersion: 2,
  idempotencyKey: "50000000-0000-4000-8000-000000000001",
  input: {
    actionType: "REJECT" as const,
    comment: "Mandatory evidence was not supplied.",
    reasonCode: "INSUFFICIENT_EVIDENCE",
  },
  sourceStageInstanceId: stageInstanceId,
  workflowInstanceId,
};
const target = {
  action: {
    actionType: "REJECT" as const,
    condition: null,
    configuration: {
      commentRequired: true,
      outcome: {
        cancelOpenStageInstances: true,
        cancelOpenTasks: true,
        publicStatusMapping: {
          description: "A decision is available for your application.",
          label: "Decision available",
          status: "OUTCOME_AVAILABLE" as const,
        },
        type: "TERMINAL" as const,
      },
      reasonCodes: ["INSUFFICIENT_EVIDENCE"],
      reversibleActionKey: null,
    },
    displayOrder: 1,
    enabled: true,
    id: "60000000-0000-4000-8000-000000000001",
    label: "Reject",
    reasonCodeRequired: true,
    stableKey: "REJECT",
  },
  stage: {
    application: {},
    completedAt: null,
    eligibility: {},
    exitCondition: null,
    fundingCall: {},
    rowVersion: 2,
    stageDefinitionId: "70000000-0000-4000-8000-000000000001",
    stageInstanceId,
    stageKey: "SCREENING",
    status: "ACTIVE" as const,
    workflowInstanceId,
    workflowVersionId: "80000000-0000-4000-8000-000000000001",
  },
  task: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executeTerminalRejectInTransaction).mockResolvedValue({
    cancelledStageInstanceIds: [stageInstanceId],
    cancelledTaskIds: [],
    transitionExecutionId: "90000000-0000-4000-8000-000000000001",
  });
});

describe("workflow action outcome service", () => {
  it("records the rejection decision before applying its terminal outcome", async () => {
    const result = await executeConfiguredWorkflowActionOutcome({} as never, {
      actorId: "a0000000-0000-4000-8000-000000000001",
      command,
      conditions: {
        actionEvaluation: {
          evaluation: null,
          passed: true,
          resolutionError: null,
        },
        available: true,
        selectedTransitionId: transitionId,
        transitionEvaluations: [{
          evaluation: null,
          passed: true,
          resolutionError: null,
        }],
      },
      conditionContext: undefined,
      configuredTransitions: { actionExists: true, transitions: [transition] },
      resultingRuntimeVersion: 3,
      target,
    });

    expect(result).toMatchObject({
      actionType: "REJECT",
      decisionId: expect.any(String),
      resultingRuntimeVersion: 4,
      transition: {
        kind: "WORKFLOW_REJECTED",
        workflowStatus: "REJECTED",
      },
    });
    expect(recordWorkflowActionExecution).toHaveBeenCalledOnce();
    expect(recordWorkflowDecision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: "REJECTED" }),
    );
    expect(executeSequentialTransitionInTransaction).not.toHaveBeenCalled();
    expect(
      vi.mocked(recordWorkflowDecision).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(executeTerminalRejectInTransaction).mock.invocationCallOrder[0],
    );
  });
  it("uses the shared withdrawal state operation for configured actions", async () => {
    const withdrawalTarget = {
      ...target,
      action: {
        ...target.action,
        actionType: "WITHDRAW" as const,
        configuration: {
          allowedStageKeys: ["SCREENING"],
          resubmissionRule: "NOT_ALLOWED" as const,
        },
        stableKey: "WITHDRAW",
      },
      stage: {
        ...target.stage,
        application: {
          id: "b0000000-0000-4000-8000-000000000001",
          reference: "SME-001",
          rowVersion: 4,
          status: "submitted",
        },
      },
    };
    const result = await executeConfiguredWorkflowActionOutcome({} as never, {
      actorId: "a0000000-0000-4000-8000-000000000001",
      command: {
        ...command,
        actionKey: "WITHDRAW",
        input: { actionType: "WITHDRAW", confirmed: true },
      },
      conditions: {
        actionEvaluation: { evaluation: null, passed: true, resolutionError: null },
        available: true,
        selectedTransitionId: null,
        transitionEvaluations: [],
      },
      conditionContext: undefined,
      configuredTransitions: { actionExists: true, transitions: [] },
      resultingRuntimeVersion: 3,
      target: withdrawalTarget,
    });
    expect(result.transition).toMatchObject({
      kind: "WORKFLOW_WITHDRAWN",
      workflowStatus: "CANCELLED",
    });
    expect(withdrawFromWorkflowAction).toHaveBeenCalledOnce();
    expect(recordWorkflowActionExecution).toHaveBeenCalledOnce();
    expect(executeSequentialTransitionInTransaction).not.toHaveBeenCalled();
  });
});
