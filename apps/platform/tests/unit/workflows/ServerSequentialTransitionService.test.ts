import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageActivationService",
  () => ({ activateStageInTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageCompletionService",
  () => ({ completeStageInTransaction: vi.fn() }),
);
vi.mock("@/modules/workflows/infrastructure/StageActivationRepository", () => ({
  loadPriorStageContext: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadStageCompletionValues: vi.fn(),
  lockStageCompletionTarget: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    completeTerminalWorkflow: vi.fn(),
    finalizeTransitionExecution: vi.fn(),
    findTransitionExecution: vi.fn(),
    loadSequentialTransitions: vi.fn(),
    recordTransitionExecution: vi.fn(),
    withTransitionExecutionTransaction: vi.fn(),
  }),
);

import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { completeStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageCompletionService";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { loadPriorStageContext } from "@/modules/workflows/infrastructure/StageActivationRepository";
import {
  loadStageCompletionValues,
  lockStageCompletionTarget,
} from "@/modules/workflows/infrastructure/StageCompletionRepository";
import {
  completeTerminalWorkflow,
  finalizeTransitionExecution,
  findTransitionExecution,
  loadSequentialTransitions,
  recordTransitionExecution,
} from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

const input = {
  actionKey: "ADVANCE",
  actorId: "10000000-0000-4000-8000-000000000001",
  correlationId: "20000000-0000-4000-8000-000000000001",
  sourceStageInstanceId: "30000000-0000-4000-8000-000000000001",
};
const source = {
  application: { requestedAmount: 100 },
  completedAt: null,
  exitCondition: null,
  fundingCall: { maximumAmount: 200 },
  stageDefinitionId: "40000000-0000-4000-8000-000000000001",
  stageInstanceId: input.sourceStageInstanceId,
  stageKey: "SCREENING",
  status: "ACTIVE" as const,
  workflowInstanceId: "50000000-0000-4000-8000-000000000001",
  workflowVersionId: "60000000-0000-4000-8000-000000000001",
};
const transition = {
  condition: null,
  id: "70000000-0000-4000-8000-000000000001",
  priority: 1,
  targetStageDefinitionId: "80000000-0000-4000-8000-000000000001",
  targetStageName: "Technical assessment",
  terminalOutcome: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findTransitionExecution).mockResolvedValue(null);
  vi.mocked(lockStageCompletionTarget).mockResolvedValue(source);
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [transition],
  });
  vi.mocked(loadPriorStageContext).mockResolvedValue([]);
  vi.mocked(loadStageCompletionValues).mockResolvedValue([]);
  vi.mocked(completeStageInTransaction).mockResolvedValue({
    completedAt: new Date("2026-09-21T10:00:00.000Z"),
    kind: "completed",
    stageInstanceId: source.stageInstanceId,
  });
  vi.mocked(recordTransitionExecution).mockResolvedValue({
    id: "90000000-0000-4000-8000-000000000001",
  });
  vi.mocked(activateStageInTransaction).mockResolvedValue({
    kind: "activated",
    stageInstanceId: "a0000000-0000-4000-8000-000000000001",
    taskIds: [],
  });
});

describe("sequential transition execution", () => {
  it("uses the configured target and records one execution before activation", async () => {
    const result = await executeSequentialTransitionInTransaction(
      {} as never,
      input,
    );

    expect(result).toMatchObject({
      kind: "transitioned",
      targetStageName: transition.targetStageName,
    });
    expect(activateStageInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stageDefinitionId: transition.targetStageDefinitionId,
      }),
    );
    expect(recordTransitionExecution).toHaveBeenCalledOnce();
    expect(finalizeTransitionExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: "TARGET_ACTIVATED" }),
    );
    expect(vi.mocked(recordTransitionExecution).mock.invocationCallOrder[0])
      .toBeLessThan(
        vi.mocked(activateStageInTransaction).mock.invocationCallOrder[0],
      );
  });

  it("blocks movement when no configured transition condition passes", async () => {
    vi.mocked(loadSequentialTransitions).mockResolvedValue({
      actionExists: true,
      transitions: [{
        ...transition,
        condition: {
          children: [{
            id: "condition",
            kind: "CONDITION",
            leftOperand: {
              key: "application.requested_amount",
              kind: "FIELD",
            },
            operator: basicOperators.GREATER_THAN,
            rightOperand: { kind: "CONSTANT", value: 200 },
          }],
          combinator: "AND",
          id: "group",
          kind: "GROUP",
        },
      }],
    });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({ kind: "transition_condition_failed" });
    expect(completeStageInTransaction).not.toHaveBeenCalled();
    expect(recordTransitionExecution).not.toHaveBeenCalled();
    expect(activateStageInTransaction).not.toHaveBeenCalled();
  });

  it("records a transition whose target entry condition fails", async () => {
    vi.mocked(activateStageInTransaction).mockResolvedValue({
      evaluation: {
        evaluation: null,
        passed: false,
        resolutionError: null,
      },
      kind: "entry_condition_failed",
    });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({ kind: "target_entry_condition_failed" });
    expect(finalizeTransitionExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: "TARGET_ENTRY_CONDITION_FAILED" }),
    );
  });

  it("returns the recorded execution without creating another stage", async () => {
    vi.mocked(findTransitionExecution).mockResolvedValue({
      actionKey: input.actionKey,
      executionId: "90000000-0000-4000-8000-000000000001",
      outcome: "TARGET_ACTIVATED",
      targetStageInstanceId: "a0000000-0000-4000-8000-000000000001",
      targetStageName: transition.targetStageName,
      workflowStatus: "ACTIVE",
    });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({ kind: "already_executed" });
    expect(lockStageCompletionTarget).not.toHaveBeenCalled();
    expect(activateStageInTransaction).not.toHaveBeenCalled();
  });

  it("completes the workflow for a configured terminal transition", async () => {
    vi.mocked(loadSequentialTransitions).mockResolvedValue({
      actionExists: true,
      transitions: [{
        ...transition,
        targetStageDefinitionId: null,
        targetStageName: null,
        terminalOutcome: "APPROVED",
      }],
    });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({ kind: "workflow_completed" });
    expect(completeTerminalWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      source.workflowInstanceId,
      expect.any(Date),
    );
    expect(activateStageInTransaction).not.toHaveBeenCalled();
  });
});
