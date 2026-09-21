import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/StageActivationRepository", () => ({
  loadPriorStageContext: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadRequiredTaskCompletions: vi.fn(),
  loadStageCompletionValues: vi.fn(),
  lockStageCompletionTarget: vi.fn(),
  persistStageCompletion: vi.fn(),
  withStageCompletionTransaction: vi.fn(),
}));

import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import { completeStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageCompletionService";
import { loadPriorStageContext } from "@/modules/workflows/infrastructure/StageActivationRepository";
import {
  loadRequiredTaskCompletions,
  loadStageCompletionValues,
  lockStageCompletionTarget,
  persistStageCompletion,
} from "@/modules/workflows/infrastructure/StageCompletionRepository";

const stageInstanceId = "10000000-0000-4000-8000-000000000001";
const input = {
  actorId: "20000000-0000-4000-8000-000000000001",
  correlationId: "30000000-0000-4000-8000-000000000001",
  stageInstanceId,
};
const target = {
  application: {},
  completedAt: null,
  exitCondition: null,
  fundingCall: {},
  stageInstanceId,
  stageKey: "FINANCE_REVIEW",
  status: "ACTIVE" as const,
  workflowInstanceId: "40000000-0000-4000-8000-000000000001",
};
const completedRequirement = {
  completedCount: 1,
  requiredCompletionCount: 1,
  taskDefinitionId: "50000000-0000-4000-8000-000000000001",
  taskKey: "FINANCE_FORM",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lockStageCompletionTarget).mockResolvedValue(target);
  vi.mocked(loadPriorStageContext).mockResolvedValue([]);
  vi.mocked(loadRequiredTaskCompletions).mockResolvedValue([
    completedRequirement,
  ]);
  vi.mocked(loadStageCompletionValues).mockResolvedValue([]);
  vi.mocked(persistStageCompletion).mockResolvedValue({ id: stageInstanceId });
});

describe("stage completion", () => {
  it("does not complete while a required task count is unmet", async () => {
    vi.mocked(loadRequiredTaskCompletions).mockResolvedValue([{
      ...completedRequirement,
      completedCount: 0,
    }]);

    await expect(completeStageInTransaction({} as never, input)).resolves
      .toMatchObject({ kind: "requirements_not_met" });
    expect(persistStageCompletion).not.toHaveBeenCalled();
  });

  it("fails closed when the exit condition does not pass", async () => {
    vi.mocked(lockStageCompletionTarget).mockResolvedValue({
      ...target,
      exitCondition: {
        children: [{
          id: "condition",
          kind: "CONDITION",
          leftOperand: {
            key: "stage.finance_review.approved",
            kind: "FIELD",
          },
          operator: basicOperators.EQUALS,
          rightOperand: { kind: "CONSTANT", value: true },
        }],
        combinator: "AND",
        id: "exit",
        kind: "GROUP",
      },
    });
    vi.mocked(loadStageCompletionValues).mockResolvedValue([{
      responseValues: { APPROVED: false },
      taskResult: null,
    }]);

    await expect(completeStageInTransaction({} as never, input)).resolves
      .toMatchObject({ kind: "exit_condition_failed" });
    expect(persistStageCompletion).not.toHaveBeenCalled();
  });

  it("persists a passing stage once with audit context", async () => {
    const result = await completeStageInTransaction({} as never, input);

    expect(result).toMatchObject({ kind: "completed", stageInstanceId });
    expect(persistStageCompletion).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        actorId: input.actorId,
        correlationId: input.correlationId,
        requirements: [completedRequirement],
        target,
      }),
    );
  });

  it("returns an already-completed stage without writing another audit", async () => {
    const completedAt = new Date("2026-09-21T12:00:00.000Z");
    vi.mocked(lockStageCompletionTarget).mockResolvedValue({
      ...target,
      completedAt,
      status: "COMPLETED",
    });

    await expect(completeStageInTransaction({} as never, input)).resolves
      .toEqual({ completedAt, kind: "already_completed", stageInstanceId });
    expect(persistStageCompletion).not.toHaveBeenCalled();
  });
});
