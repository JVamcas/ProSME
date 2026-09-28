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

import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { completeStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageCompletionService";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { loadPriorStageContext } from "@/modules/workflows/infrastructure/StageActivationRepository";
import {
  loadStageCompletionValues,
  lockStageCompletionTarget,
} from "@/modules/workflows/infrastructure/StageCompletionRepository";
import {
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
const targetStages = [
  { id: "80000000-0000-4000-8000-000000000001", name: "Technical assessment" },
  { id: "80000000-0000-4000-8000-000000000002", name: "Financial review" },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findTransitionExecution).mockResolvedValue(null);
  vi.mocked(lockStageCompletionTarget).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stageDefinitionId: "40000000-0000-4000-8000-000000000001",
    stageInstanceId: input.sourceStageInstanceId,
    stageKey: "SCREENING",
    status: "ACTIVE",
    workflowInstanceId: "50000000-0000-4000-8000-000000000001",
    workflowVersionId: "60000000-0000-4000-8000-000000000001",
  } as never);
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [{
      condition: null,
      id: "70000000-0000-4000-8000-000000000001",
      priority: 1,
      targetStages,
      terminalOutcome: null,
    }],
  });
  vi.mocked(loadPriorStageContext).mockResolvedValue([]);
  vi.mocked(loadStageCompletionValues).mockResolvedValue([]);
  vi.mocked(completeStageInTransaction).mockResolvedValue({
    completedAt: new Date("2026-09-21T10:00:00.000Z"),
    kind: "completed",
    stageInstanceId: input.sourceStageInstanceId,
  });
  vi.mocked(recordTransitionExecution).mockResolvedValue({ id: "execution-id" });
});

describe("parallel transition execution", () => {
  it("activates every fork target independently", async () => {
    vi.mocked(activateStageInTransaction)
      .mockResolvedValueOnce({
        kind: "activated",
        stageInstanceId: "a0000000-0000-4000-8000-000000000001",
        taskIds: [],
      })
      .mockResolvedValueOnce({
        kind: "activated",
        stageInstanceId: "a0000000-0000-4000-8000-000000000002",
        taskIds: [],
      });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({
      kind: "transitioned",
      targets: [
        { outcome: "ACTIVATED", targetStageName: "Technical assessment" },
        { outcome: "ACTIVATED", targetStageName: "Financial review" },
      ],
    });
  });

  it("records independent entry-condition results", async () => {
    vi.mocked(activateStageInTransaction)
      .mockResolvedValueOnce({
        kind: "activated",
        stageInstanceId: "a0000000-0000-4000-8000-000000000001",
        taskIds: [],
      })
      .mockResolvedValueOnce({
        evaluation: { evaluation: null, passed: false, resolutionError: null },
        kind: "entry_condition_failed",
      });

    await expect(executeSequentialTransitionInTransaction(
      {} as never,
      input,
    )).resolves.toMatchObject({
      targets: [
        { outcome: "ACTIVATED" },
        { outcome: "ENTRY_CONDITION_FAILED" },
      ],
    });
  });

  it("records an unsatisfied join without activating it", async () => {
    vi.mocked(loadSequentialTransitions).mockResolvedValue({
      actionExists: true,
      transitions: [{
        condition: null,
        id: "70000000-0000-4000-8000-000000000001",
        priority: 1,
        targetStages: [targetStages[0]],
        terminalOutcome: null,
      }],
    });
    vi.mocked(activateStageInTransaction).mockResolvedValue({
      incompletePredecessorStageKeys: ["FINANCIAL_REVIEW"],
      kind: "join_pending",
    });

    await executeSequentialTransitionInTransaction({} as never, input);

    expect(finalizeTransitionExecution).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outcome: "TARGET_JOIN_PENDING" }),
    );
  });
});
