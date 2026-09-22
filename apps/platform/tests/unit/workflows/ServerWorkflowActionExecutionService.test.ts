import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({ buildWorkflowActionConditionContext: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({ loadSequentialTransitions: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository",
  () => ({
    claimWorkflowActionRuntimeVersion: vi.fn(),
    completeActionTask: vi.fn(),
    findWorkflowActionExecution: vi.fn(),
    lockWorkflowActionExecutionTarget: vi.fn(),
    recordWorkflowActionExecution: vi.fn(),
    withWorkflowActionExecutionTransaction: vi.fn(),
    workflowActionExecutionDatabase: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({ configuredActionTargetsAreValid: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowDecisionRepository",
  () => ({ recordApprovalDecision: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerSequentialTransitionService",
  () => ({ executeSequentialTransitionInTransaction: vi.fn() }),
);

import type { AuthenticatedUser } from "@/auth/types";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { WorkflowActionExecutionError } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import { executeWorkflowAction } from "@/modules/workflows/application/runtime/ServerWorkflowActionExecutionService";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
  recordWorkflowActionExecution,
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { recordApprovalDecision } from "@/modules/workflows/infrastructure/WorkflowDecisionRepository";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";

const actorId = "10000000-0000-4000-8000-000000000001";
const workflowInstanceId = "20000000-0000-4000-8000-000000000001";
const stageInstanceId = "30000000-0000-4000-8000-000000000001";
const taskId = "40000000-0000-4000-8000-000000000001";
const input = {
  actionKey: "ADVANCE",
  correlationId: "50000000-0000-4000-8000-000000000001",
  expectedRuntimeVersion: 2,
  idempotencyKey: "60000000-0000-4000-8000-000000000001",
  input: { actionType: "APPROVE_ADVANCE" as const },
  sourceStageInstanceId: stageInstanceId,
  taskId,
  workflowInstanceId,
};
const target = {
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
    rowVersion: 5,
    status: "IN_PROGRESS",
  },
};

function user(capabilities = ["workflow.task.assigned.decide"]) {
  return {
    capabilities: new Set(capabilities),
    id: actorId,
    status: "active",
  } as unknown as AuthenticatedUser;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workflowActionExecutionDatabase).mockReturnValue({} as never);
  vi.mocked(findWorkflowActionExecution).mockResolvedValue(null);
  vi.mocked(withWorkflowActionExecutionTransaction).mockImplementation(
    async (work) => work({} as never),
  );
  vi.mocked(lockWorkflowActionExecutionTarget).mockResolvedValue(target);
  vi.mocked(buildWorkflowActionConditionContext).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  });
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [],
  });
  vi.mocked(claimWorkflowActionRuntimeVersion).mockResolvedValue(3);
  vi.mocked(completeActionTask).mockResolvedValue({ id: taskId });
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(true);
  vi.mocked(executeSequentialTransitionInTransaction).mockResolvedValue({
    completion: { kind: "requirements_not_met", requirements: [] },
    kind: "source_stage_not_completed",
  });
});

describe("server workflow action execution", () => {
  it("validates, mutates and records through one transaction boundary", async () => {
    const result = await executeWorkflowAction(user(), input);

    expect(result).toMatchObject({
      actionKey: "ADVANCE",
      resultingRuntimeVersion: 3,
      transition: { kind: "STAGE_ACTIVE" },
    });
    expect(completeActionTask).toHaveBeenCalledOnce();
    expect(executeSequentialTransitionInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionKey: "ADVANCE",
        conditionSelection: {
          selectedTransitionId: null,
          transitionEvaluations: [],
        },
        conditionContext: expect.any(Object),
      }),
    );
    expect(recordWorkflowActionExecution).toHaveBeenCalledOnce();
    expect(recordApprovalDecision).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actionDefinitionId: target.action.id,
        actionExecutionId: result.actionExecutionId,
        actorId,
        decisionId: result.decisionId,
        normalizedInput: input.input,
      }),
    );
  });

  it("returns an exact idempotent replay without entering a transaction", async () => {
    const replayResult = {
      actionExecutionId: "a0000000-0000-4000-8000-000000000001",
      actionKey: "ADVANCE",
      actionType: "APPROVE_ADVANCE" as const,
      decisionId: "b0000000-0000-4000-8000-000000000001",
      executedAt: "2026-09-22T08:00:00.000Z",
      resultingRuntimeVersion: 3,
      sourceStageInstanceId: stageInstanceId,
      taskId,
      transition: {
        kind: "STAGE_ACTIVE" as const,
        targetStageInstanceId: null,
        targetStageName: null,
        workflowStatus: "ACTIVE" as const,
      },
      workflowInstanceId,
    };
    vi.mocked(findWorkflowActionExecution).mockResolvedValue({
      matchesCommand: true,
      result: replayResult,
    });

    await expect(executeWorkflowAction(user(), input)).resolves.toEqual(
      replayResult,
    );
    expect(withWorkflowActionExecutionTransaction).not.toHaveBeenCalled();
  });

  it("denies permission and assignment context before mutation", async () => {
    await expect(executeWorkflowAction(user([]), input)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(claimWorkflowActionRuntimeVersion).not.toHaveBeenCalled();

    vi.mocked(lockWorkflowActionExecutionTarget).mockResolvedValue({
      ...target,
      task: { ...target.task, assignedToActor: false },
    });
    await expect(executeWorkflowAction(user(), input)).rejects.toMatchObject({
      code: "INVALID_RUNTIME_CONTEXT",
    });
    expect(claimWorkflowActionRuntimeVersion).not.toHaveBeenCalled();
  });

  it("raises an explicit stale-version error before mutation", async () => {
    vi.mocked(lockWorkflowActionExecutionTarget).mockResolvedValue({
      ...target,
      stage: { ...target.stage, rowVersion: 4 },
    });
    await expect(executeWorkflowAction(user(), input)).rejects.toEqual(
      expect.objectContaining<Partial<WorkflowActionExecutionError>>({
        code: "STALE_RUNTIME_VERSION",
      }),
    );
    expect(claimWorkflowActionRuntimeVersion).not.toHaveBeenCalled();
  });
});
