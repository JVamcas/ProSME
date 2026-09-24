import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  stageInstances,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowTasks,
} from "@/db/schema";
import { rejectTerminalWorkflow } from "@/modules/workflows/infrastructure/WorkflowRejectionRepository";

const rejectedAt = new Date("2026-09-22T08:00:00.000Z");
const configuration = {
  cancelOpenStageInstances: true,
  cancelOpenTasks: true,
  publicStatusMapping: {
    description: "A decision is available for your application.",
    label: "Decision available",
    status: "OUTCOME_AVAILABLE" as const,
  },
  type: "TERMINAL" as const,
};

describe("workflow rejection repository", () => {
  it("cancels configured work and stores internal and public outcomes separately", async () => {
    const updates: Array<{ set: unknown; table: unknown }> = [];
    const inserts: Array<{ table: unknown; value: unknown }> = [];
    const returned = new Map<unknown, unknown[]>([
      [workflowTasks, [{ id: "task-id" }]],
      [stageInstances, [{ id: "stage-id" }]],
      [workflowInstances, [{ id: "workflow-id" }]],
    ]);
    const transaction = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((value: unknown) => {
          inserts.push({ table, value });
          return Promise.resolve();
        }),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((set: unknown) => {
          updates.push({ set, table });
          return {
            where: vi.fn(() => ({
              returning: vi.fn(() => Promise.resolve(returned.get(table))),
            })),
          };
        }),
      })),
    } as never;

    const result = await rejectTerminalWorkflow(transaction, {
      actorId: "10000000-0000-4000-8000-000000000001",
      configuration,
      correlationId: "20000000-0000-4000-8000-000000000001",
      rejectedAt,
      sourceStageInstanceId: "30000000-0000-4000-8000-000000000001",
      terminalOutcome: "REJECTED_INCOMPLETE",
      workflowInstanceId: "40000000-0000-4000-8000-000000000001",
    });

    expect(result).toEqual({
      cancelledStageInstanceIds: ["stage-id"],
      cancelledTaskIds: ["task-id"],
    });
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        set: expect.objectContaining({ status: "CANCELLED" }),
        table: workflowTasks,
      }),
      expect.objectContaining({
        set: expect.objectContaining({ status: "CANCELLED" }),
        table: stageInstances,
      }),
      expect.objectContaining({
        set: expect.objectContaining({
          completedAt: rejectedAt,
          publicStatus: configuration.publicStatusMapping,
          status: "REJECTED",
          terminalOutcome: "REJECTED_INCOMPLETE",
        }),
        table: workflowInstances,
      }),
    ]));
    expect(inserts).toEqual(expect.arrayContaining([
      {
        table: workflowEvents,
        value: expect.objectContaining({ eventCode: "WORKFLOW_REJECTED" }),
      },
      {
        table: workflowAuditEntries,
        value: expect.objectContaining({
          action: "WORKFLOW_REJECTED",
          targetType: "WORKFLOW_INSTANCE",
        }),
      },
    ]));
  });
});
