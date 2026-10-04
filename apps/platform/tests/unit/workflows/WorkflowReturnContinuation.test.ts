import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/StageActivationRepository", () => ({
  findStageIteration: vi.fn(),
  loadStageReworkIteration: vi.fn(),
  loadIncompleteJoinPredecessors: vi.fn(),
  loadPriorStageContext: vi.fn(),
  loadStageActivationTasks: vi.fn(),
  lockStageActivationTarget: vi.fn(),
  persistStageActivation: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadStageCompletionValues: vi.fn(),
  lockStageCompletionTarget: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    findTransitionExecution: vi.fn(),
    loadSequentialTransitions: vi.fn(),
    recordTransitionExecution: vi.fn(),
    finalizeTransitionExecution: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageCompletionService",
  () => ({
    completeStageInTransaction: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowRfiRepository", () => ({
  createStageActivationWorkflowRfi: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowTaskAssignmentNotificationService",
  () => ({
    captureWorkflowTaskAssignmentNotification: vi.fn(),
  }),
);

import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { completeStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageCompletionService";
import {
  findStageIteration,
  loadStageReworkIteration,
  loadIncompleteJoinPredecessors,
  loadPriorStageContext,
  loadStageActivationTasks,
  lockStageActivationTarget,
  persistStageActivation,
} from "@/modules/workflows/infrastructure/StageActivationRepository";
import { lockStageCompletionTarget } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import {
  findTransitionExecution,
  loadSequentialTransitions,
  recordTransitionExecution,
} from "@/modules/workflows/infrastructure/TransitionExecutionRepository";
import { createStageActivationWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiRepository";
import type { StageCompletionTarget } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { stageActivationTarget } from "../../support/StageActivationTargetFixture";

type Stage = {
  id: string;
  definition: string;
  iteration: number;
  status: "ACTIVE" | "COMPLETED";
  context: Record<string, unknown> | null;
};
let stages: Stage[];
let createdTasks: { id: string; stageId: string; status: "PENDING" }[];
const input = {
  actorId: "actor",
  correlationId: "correlation",
  actionKey: "ADVANCE",
  sourceStageInstanceId: "B2",
  conditionContext: {
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  stages = [
    {
      id: "B1",
      definition: "B",
      iteration: 1,
      status: "COMPLETED",
      context: null,
    },
    {
      id: "C1",
      definition: "C",
      iteration: 1,
      status: "COMPLETED",
      context: null,
    },
    {
      id: "B2",
      definition: "B",
      iteration: 2,
      status: "ACTIVE",
      context: { sourceStageInstanceId: "C1", dataHandling: "RETAIN" },
    },
  ];
  createdTasks = [];
  vi.mocked(findTransitionExecution).mockResolvedValue(null);
  vi.mocked(recordTransitionExecution).mockResolvedValue({ id: "execution" });
  vi.mocked(createStageActivationWorkflowRfi).mockResolvedValue(null);
  vi.mocked(loadPriorStageContext).mockResolvedValue([]);
  vi.mocked(loadIncompleteJoinPredecessors).mockResolvedValue([]);
  vi.mocked(loadStageActivationTasks).mockResolvedValue([
    {
      id: "review",
      stableKey: "REVIEW",
      name: "Review",
      formVersionId: null,
      namedUserOverrideId: null,
      roleId: null,
      reviewerCount: 1,
      taskType: "CONTRIBUTING",
    },
  ]);
  vi.mocked(lockStageCompletionTarget).mockImplementation(async (_, id) => {
    const stage = stages.find((candidate) => candidate.id === id)!;
    let context = stage.context;
    while (context) {
      const origin = stages.find(
        (candidate) => candidate.id === context?.sourceStageInstanceId,
      );
      if (origin?.definition !== stage.definition) break;
      context = origin.context;
    }
    return {
      application: {},
      fundingCall: {},
      eligibility: null,
      completedAt: null,
      exitCondition: null,
      stageDefinitionId: stage.definition,
      stageKey: stage.definition,
      stageInstanceId: id,
      status: stage.status,
      workflowInstanceId: "workflow",
      workflowVersionId: "version",
      returnContext: context,
    } satisfies StageCompletionTarget;
  });
  vi.mocked(loadSequentialTransitions).mockImplementation(
    async (_, request) => ({
      actionExists: true,
      transitions: [
        {
          id: "transition",
          condition: null,
          priority: 1,
          terminalOutcome: null,
          targetStages: [
            {
              id: ({ A: "B", B: "C", C: "D" } as Record<string, string>)[
                request.sourceStageDefinitionId
              ],
              name: "Next review",
            },
          ],
        },
      ],
    }),
  );
  vi.mocked(completeStageInTransaction).mockImplementation(
    async (_, request) => {
      stages.find((stage) => stage.id === request.stageInstanceId)!.status =
        "COMPLETED";
      return {
        kind: "completed",
        completedAt: new Date(),
        stageInstanceId: request.stageInstanceId,
      };
    },
  );
  vi.mocked(lockStageActivationTarget).mockImplementation(
    async (_, workflow, definition) => ({
      ...stageActivationTarget,
      workflowInstanceId: workflow,
      stageDefinitionId: definition,
      repeatable: false,
      entryCondition: null,
      joinPredecessorStageKeys: [],
    }),
  );
  vi.mocked(loadStageReworkIteration).mockImplementation(
    async (_, workflow, definition) => {
      const previous = stages.filter(
        (stage) => stage.definition === definition,
      );
      return {
        nextIterationNumber:
          Math.max(0, ...previous.map((stage) => stage.iteration)) + 1,
        activeStageInstanceId:
          previous.find((stage) => stage.status === "ACTIVE")?.id ?? null,
      };
    },
  );
  vi.mocked(findStageIteration).mockResolvedValue(null);
  vi.mocked(persistStageActivation).mockImplementation(async (_, request) => {
    const id = `${request.target.stageDefinitionId}${request.iterationNumber}`;
    stages.push({
      id,
      definition: request.target.stageDefinitionId,
      iteration: request.iterationNumber,
      status: "ACTIVE",
      context: request.returnContext ?? null,
    });
    const task = {
      id: `${id}-review`,
      stageId: id,
      status: "PENDING" as const,
    };
    createdTasks.push(task);
    return {
      stage: { id },
      tasks: [
        {
          id: task.id,
          assignedUserId: null,
          workflowTaskDefinitionId: "review",
        },
      ],
    } as never;
  });
});

describe("Return followed by normal progression", () => {
  it("creates C2 after corrected B2, then resumes normal work beyond C", async () => {
    const original = structuredClone(stages.slice(0, 2));
    await executeSequentialTransitionInTransaction({} as never, input);
    expect(stages.at(-1)).toMatchObject({
      id: "C2",
      iteration: 2,
      status: "ACTIVE",
      context: { sourceStageInstanceId: "C1", dataHandling: "CLEAR" },
    });
    expect(createdTasks).toEqual([
      { id: "C2-review", stageId: "C2", status: "PENDING" },
    ]);
    expect(stages.slice(0, 2)).toEqual(original);

    await executeSequentialTransitionInTransaction({} as never, {
      ...input,
      sourceStageInstanceId: "C2",
    });
    expect(stages.at(-1)).toMatchObject({
      id: "D1",
      iteration: 1,
      context: null,
    });
    expect(stages.slice(0, 2)).toEqual(original);
  });

  it("continues the outer return after a nested return is corrected", async () => {
    stages[2].status = "COMPLETED";
    stages.push({
      id: "A2",
      definition: "A",
      iteration: 2,
      status: "ACTIVE",
      context: { sourceStageInstanceId: "B2", dataHandling: "RETAIN" },
    });
    await executeSequentialTransitionInTransaction({} as never, {
      ...input,
      sourceStageInstanceId: "A2",
    });
    expect(stages.at(-1)?.id).toBe("B3");
    await executeSequentialTransitionInTransaction({} as never, {
      ...input,
      sourceStageInstanceId: "B3",
    });
    expect(stages.at(-1)?.id).toBe("C2");
    expect(createdTasks.map((task) => task.stageId)).toEqual(["B3", "C2"]);
  });

  it("reuses a current active successor rather than creating another task set", async () => {
    stages.push({
      id: "C2",
      definition: "C",
      iteration: 2,
      status: "ACTIVE",
      context: null,
    });
    await executeSequentialTransitionInTransaction({} as never, input);
    expect(stages).toHaveLength(4);
    expect(createdTasks).toEqual([]);
    expect(persistStageActivation).not.toHaveBeenCalled();
  });
});
