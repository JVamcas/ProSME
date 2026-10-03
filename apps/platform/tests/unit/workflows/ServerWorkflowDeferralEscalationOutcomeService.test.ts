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
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowDeferralRepository",
  () => ({
    resumeDueWorkflowDeferral: vi.fn(),
    startWorkflowDeferral: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowEscalationRepository",
  () => ({
    resolveActiveWorkflowEscalation: vi.fn(),
    startWorkflowEscalation: vi.fn(),
  }),
);

import { executeConfiguredWorkflowActionOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowActionOutcomeService";
import type { OutcomeInput } from "@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport";
import { startWorkflowDeferral } from "@/modules/workflows/infrastructure/WorkflowDeferralRepository";
import { startWorkflowEscalation } from "@/modules/workflows/infrastructure/WorkflowEscalationRepository";

const stageId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000001";
const workflowId = "30000000-0000-4000-8000-000000000001";

function baseInput(): Omit<OutcomeInput, "command" | "target"> {
  return {
    actorId: "40000000-0000-4000-8000-000000000001",
    conditions: {
      actionEvaluation: { evaluation: null, passed: true, resolutionError: null },
      available: true,
      selectedTransitionId: null,
      transitionEvaluations: [],
    },
    conditionContext: undefined,
    configuredTransitions: { actionExists: true, transitions: [] },
    resultingRuntimeVersion: 3,
  };
}

function runtimeTarget() {
  return {
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
      status: "ACTIVE" as const,
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
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(startWorkflowDeferral).mockResolvedValue({ id: "deferral" });
  vi.mocked(startWorkflowEscalation).mockResolvedValue({ id: "escalation" });
});

describe("workflow deferral and escalation outcomes", () => {
  it("blocks a date-based deferral without completing the task", async () => {
    const runtime = runtimeTarget();
    const result = await executeConfiguredWorkflowActionOutcome(
      {} as never,
      {
        ...baseInput(),
        command: {
          actionKey: "DEFER",
          correlationId: "70000000-0000-4000-8000-000000000001",
          expectedRuntimeVersion: 2,
          idempotencyKey: "80000000-0000-4000-8000-000000000001",
          input: {
            actionType: "DEFER",
            comment: "Await the next committee meeting.",
            targetDate: "2027-01-15",
            targetType: "DATE",
          },
          sourceStageInstanceId: stageId,
          taskId,
          workflowInstanceId: workflowId,
        },
        target: {
          ...runtime,
          action: {
            actionType: "DEFER",
            condition: null,
            configuration: {
              continuation: "RESUME_ON_DATE",
              targetDate: "2027-01-15",
              targetType: "DATE",
            },
            displayOrder: 1,
            enabled: true,
            id: "90000000-0000-4000-8000-000000000001",
            label: "Defer",
            reasonRequired: false,
            stableKey: "DEFER",
          },
        },
      },
    );

    expect(result.transition.kind).toBe("STAGE_BLOCKED");
    expect(startWorkflowDeferral).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        continuation: "RESUME_ON_DATE",
        mode: "DATE",
        stageInstanceId: stageId,
      }),
    );
  });

  it("records a configured escalation without completing the stage", async () => {
    const runtime = runtimeTarget();
    const targetId = "a0000000-0000-4000-8000-000000000001";
    const result = await executeConfiguredWorkflowActionOutcome(
      {} as never,
      {
        ...baseInput(),
        command: {
          actionKey: "ESCALATE",
          correlationId: "b0000000-0000-4000-8000-000000000001",
          expectedRuntimeVersion: 2,
          idempotencyKey: "c0000000-0000-4000-8000-000000000001",
          input: {
            actionType: "ESCALATE",
            comment: "Senior authority is required.",
          },
          sourceStageInstanceId: stageId,
          taskId,
          workflowInstanceId: workflowId,
        },
        target: {
          ...runtime,
          action: {
            actionType: "ESCALATE",
            condition: null,
            configuration: {
              blockUntilResolved: true,
              responsibility: "SHARE",
              targetId,
              targetType: "ROLE",
              trigger: "MANUAL",
            },
            displayOrder: 1,
            enabled: true,
            id: "d0000000-0000-4000-8000-000000000001",
            label: "Escalate",
            reasonRequired: false,
            stableKey: "ESCALATE",
          },
        },
      },
    );

    expect(result.transition.kind).toBe("STAGE_ACTIVE");
    expect(startWorkflowEscalation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        configuration: expect.objectContaining({ targetId }),
        taskId,
      }),
    );
  });
});
