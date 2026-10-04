import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/ServerApplicationWithdrawalService", () => ({
  withdrawFromWorkflowAction: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository",
  () => ({
    recordWorkflowActionExecution: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowDecisionRepository",
  () => ({
    recordWorkflowDecision: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerRejectWorkflowActionService",
  () => ({
    executeTerminalRejectInTransaction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerSequentialTransitionService",
  () => ({
    executeSequentialTransitionInTransaction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageActivationService",
  () => ({
    activateStageInTransaction: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowControlRepository", () => ({
  hasActiveWorkflowReferral: vi.fn(),
  recordWorkflowReferral: vi.fn(),
  recordWorkflowRework: vi.fn(),
}));

vi.mock("@/modules/workflows/infrastructure/WorkflowHoldRepository", () => ({
  resumeWorkflowHold: vi.fn(),
  startWorkflowHold: vi.fn(),
}));

import { executeConfiguredWorkflowActionOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowActionOutcomeService";
import type { WorkflowActionExecutionTarget } from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import {
  resumeWorkflowHold,
  startWorkflowHold,
} from "@/modules/workflows/infrastructure/WorkflowHoldRepository";

const stageId = "10000000-0000-4000-8000-000000000001";
const workflowId = "20000000-0000-4000-8000-000000000001";
const taskId = "30000000-0000-4000-8000-000000000001";

function target(
  actionType: "PUT_ON_HOLD" | "RESUME",
): WorkflowActionExecutionTarget {
  return {
    action: {
      actionType,
      condition: null,
      configuration:
        actionType === "PUT_ON_HOLD"
          ? {
              reviewDateRequired: true,
              scope: "STAGE" as const,
            }
          : { scope: "STAGE" as const },
      displayOrder: 1,
      enabled: true,
      id: "40000000-0000-4000-8000-000000000001",
      label: actionType === "PUT_ON_HOLD" ? "Put on hold" : "Resume",
      reasonRequired: actionType === "PUT_ON_HOLD",
      stableKey: actionType,
    },
    stage: {
      application: {},
      completedAt: null,
      eligibility: {},
      exitCondition: null,
      fundingCall: {},
      rowVersion: 2,
      stageDefinitionId: "50000000-0000-4000-8000-000000000001",
      stageInstanceId: stageId,
      stageKey: "ASSESSMENT",
      status:
        actionType === "RESUME" ? ("BLOCKED" as const) : ("ACTIVE" as const),
      workflowInstanceId: workflowId,
      workflowVersionId: "60000000-0000-4000-8000-000000000001",
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
      rowVersion: 1,
      status: "IN_PROGRESS",
    },
  } as WorkflowActionExecutionTarget;
}

function outcomeInput(actionType: "PUT_ON_HOLD" | "RESUME") {
  return {
    actorId: "70000000-0000-4000-8000-000000000001",
    command: {
      actionKey: actionType,
      correlationId: "80000000-0000-4000-8000-000000000001",
      expectedRuntimeVersion: 2,
      idempotencyKey: "90000000-0000-4000-8000-000000000001",
      input:
        actionType === "PUT_ON_HOLD"
          ? {
              actionType: "PUT_ON_HOLD" as const,
              scope: "STAGE" as const,
              reason: "EXTERNAL_REVIEW",
              reviewDate: "2027-01-15",
            }
          : {
              actionType: "RESUME" as const,
              holdId: "a0000000-0000-4000-8000-000000000001",
              comment: "Review complete.",
            },
      sourceStageInstanceId: stageId,
      taskId,
      workflowInstanceId: workflowId,
    },
    conditions: {
      actionEvaluation: {
        evaluation: null,
        passed: true,
        resolutionError: null,
      },
      available: true,
      selectedTransitionId: null,
      transitionEvaluations: [],
    },
    conditionContext: undefined,
    configuredTransitions: { actionExists: true, transitions: [] },
    resultingRuntimeVersion: 3,
    target: target(actionType),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(startWorkflowHold).mockResolvedValue({
    id: "hold",
    heldAt: new Date(),
  } as never);
  vi.mocked(resumeWorkflowHold).mockResolvedValue({
    id: "hold",
    heldAt: new Date(),
  } as never);
});

describe("workflow hold outcome", () => {
  it("records and ends a stage hold without advancing work", async () => {
    const held = await executeConfiguredWorkflowActionOutcome(
      {} as never,
      outcomeInput("PUT_ON_HOLD"),
    );
    expect(held.transition.kind).toBe("STAGE_BLOCKED");
    expect(startWorkflowHold).toHaveBeenCalledOnce();

    const resumed = await executeConfiguredWorkflowActionOutcome(
      {} as never,
      outcomeInput("RESUME"),
    );
    expect(resumed.transition.kind).toBe("HOLD_ENDED");
    expect(resumeWorkflowHold).toHaveBeenCalledOnce();
  });
  it.each([
    ["2027-01-15T14:30:00+02:00", "2027-01-15T12:30:00.000Z"],
    ["2027-01-15T12:30:00.000Z", "2027-01-15T12:30:00.000Z"],
    ["2027-01-15", "2027-01-15T00:00:00.000Z"],
  ])("preserves the review timestamp %s", async (reviewDate, expected) => {
    const input = outcomeInput("PUT_ON_HOLD");
    await executeConfiguredWorkflowActionOutcome({} as never, {
      ...input,
      command: {
        ...input.command,
        input: { actionType: "PUT_ON_HOLD", scope: "TASK", reviewDate },
      },
    });
    expect(startWorkflowHold).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ reviewAt: new Date(expected) }),
    );
  });

  it.each([
    ["TASK", "TASK_HELD"],
    ["APPLICATION", "WORKFLOW_HELD"],
  ] as const)("records the selected %s scope", async (scope, kind) => {
    const input = outcomeInput("PUT_ON_HOLD");
    const held = await executeConfiguredWorkflowActionOutcome({} as never, {
      ...input,
      command: {
        ...input.command,
        input: { actionType: "PUT_ON_HOLD", scope, reviewDate: "2027-01-15" },
      },
    });
    expect(held.transition).toMatchObject({
      kind,
      targets: [],
      workflowStatus: "ACTIVE",
    });
    expect(startWorkflowHold).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ scope }),
    );
  });
});
