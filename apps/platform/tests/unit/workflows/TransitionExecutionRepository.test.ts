import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  transitionExecutions,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import {
  finalizeTransitionExecution,
  loadSequentialTransitions,
  recordTransitionExecution,
} from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

const transition = {
  condition: null,
  id: "10000000-0000-4000-8000-000000000001",
  priority: 1,
  targetStageDefinitionId: "20000000-0000-4000-8000-000000000001",
  targetStageName: "Technical assessment",
  terminalOutcome: null,
};

describe("transition execution repository", () => {
  it("returns ordered transition projections without leaking action rows", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ actionId: "action-id", ...transition }],
    });

    await expect(loadSequentialTransitions(
      { execute } as never,
      {
        actionKey: "ADVANCE",
        sourceStageDefinitionId: "30000000-0000-4000-8000-000000000001",
        workflowVersionId: "40000000-0000-4000-8000-000000000001",
      },
    )).resolves.toEqual({
      actionExists: true,
      transitions: [transition],
    });
  });

  it("persists and finalizes an auditable transition execution", async () => {
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    const insert = vi.fn((table: unknown) => ({
      values: vi.fn((value: unknown) => {
        inserted.push({ table, value });
        if (table === transitionExecutions) {
          return {
            returning: vi.fn().mockResolvedValue([{ id: "execution-id" }]),
          };
        }
        return Promise.resolve();
      }),
    }));
    const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    const transaction = { insert, update: vi.fn(() => ({ set })) } as never;
    const common = {
      actionKey: "ADVANCE",
      actorId: "50000000-0000-4000-8000-000000000001",
      correlationId: "60000000-0000-4000-8000-000000000001",
      sourceStageInstanceId: "70000000-0000-4000-8000-000000000001",
      transition,
      workflowInstanceId: "80000000-0000-4000-8000-000000000001",
    };

    const execution = await recordTransitionExecution(transaction, {
      ...common,
      conditionEvaluation: {
        evaluation: null,
        passed: true,
        resolutionError: null,
      },
    });
    await finalizeTransitionExecution(transaction, {
      ...common,
      executionId: execution.id,
      outcome: "TARGET_ACTIVATED",
      targetStageInstanceId: "90000000-0000-4000-8000-000000000001",
    });

    expect(set).toHaveBeenCalledWith({
      outcome: "TARGET_ACTIVATED",
      targetStageInstanceId: "90000000-0000-4000-8000-000000000001",
    });
    expect(inserted).toEqual(expect.arrayContaining([
      {
        table: workflowEvents,
        value: expect.objectContaining({ eventCode: "TRANSITION_EXECUTED" }),
      },
      {
        table: workflowAuditEntries,
        value: expect.objectContaining({
          action: "TRANSITION_EXECUTED",
          targetId: "execution-id",
          targetType: "WORKFLOW_TRANSITION_EXECUTION",
        }),
      },
    ]));
  });
});
