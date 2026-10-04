import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  transitionExecutions,
  transitionExecutionTargets,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import {
  completeTerminalWorkflow,
  finalizeTransitionExecution,
  loadSequentialTransitions,
  recordTransitionExecution,
} from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

const transition = {
  condition: null,
  id: "10000000-0000-4000-8000-000000000001",
  priority: 1,
  targetStages: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      name: "Technical assessment",
    },
  ],
  terminalOutcome: null,
};

describe("transition execution repository", () => {
  it("returns ordered transition projections without leaking action rows", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [{ actionId: "action-id", ...transition }],
    });

    await expect(
      loadSequentialTransitions({ execute } as never, {
        actionKey: "ADVANCE",
        sourceStageDefinitionId: "30000000-0000-4000-8000-000000000001",
        workflowVersionId: "40000000-0000-4000-8000-000000000001",
      }),
    ).resolves.toEqual({
      actionExists: true,
      transitions: [transition],
    });
  });

  it("projects custom terminal wording for the runtime consumer", async () => {
    const terminalApplicantStatus = {
      label: "Recovery review",
      description: "Please review the decision.",
    };
    const execute = vi.fn().mockResolvedValue({
      rows: [{ actionId: "action-id", ...transition, terminalApplicantStatus }],
    });
    const result = await loadSequentialTransitions({ execute } as never, {
      actionKey: "ADVANCE",
      sourceStageDefinitionId: "30000000-0000-4000-8000-000000000001",
      workflowVersionId: "40000000-0000-4000-8000-000000000001",
    });
    expect(result.transitions[0].terminalApplicantStatus).toEqual(
      terminalApplicantStatus,
    );
    expect(new PgDialect().sqlToQuery(execute.mock.calls[0][0]).sql).toContain(
      'transition.terminal_applicant_status AS "terminalApplicantStatus"',
    );
  });

  it("stores terminal outcome and applicant wording on completion", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [{ id: "workflow" }] });
    const publicStatus = {
      label: "Award complete",
      description: "Your award is complete.",
      status: "CLOSED" as const,
    };
    await expect(
      completeTerminalWorkflow(
        { execute } as never,
        "40000000-0000-4000-8000-000000000001",
        new Date("2026-10-03T08:00:00Z"),
        "COMPLETED",
        publicStatus,
      ),
    ).resolves.toBe(true);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.sql).toContain("terminal_outcome =");
    expect(query.sql).toContain("public_status =");
    expect(query.sql).toContain("AND stage.status = 'ACTIVE'");
    expect(query.params).toContain("COMPLETED");
    expect(query.params).toContain(JSON.stringify(publicStatus));
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
      targets: [
        {
          outcome: "ACTIVATED",
          targetStageDefinitionId: transition.targetStages[0].id,
          targetStageInstanceId: "90000000-0000-4000-8000-000000000001",
          targetStageName: transition.targetStages[0].name,
        },
      ],
    });

    expect(set).toHaveBeenCalledWith({
      outcome: "TARGET_ACTIVATED",
    });
    expect(inserted).toEqual(
      expect.arrayContaining([
        {
          table: transitionExecutionTargets,
          value: [expect.objectContaining({ outcome: "ACTIVATED" })],
        },
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
      ]),
    );
  });
});
