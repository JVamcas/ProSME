import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import { persistWorkflowTaskTransition } from "@/modules/workflows/infrastructure/WorkflowTaskLifecycleRepository";

describe("workflow task lifecycle repository", () => {
  it("persists completion, event, and audit in one transaction", async () => {
    const completedAt = new Date("2026-09-21T12:00:00.000Z");
    const updated = {
      assignedUserId: "11111111-1111-4111-8111-111111111111",
      claimedAt: new Date("2026-09-21T10:00:00.000Z"),
      completedAt,
      id: "22222222-2222-4222-8222-222222222222",
      rowVersion: 4,
      startedAt: new Date("2026-09-21T11:00:00.000Z"),
      status: "COMPLETED" as const,
    };
    const set = vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn().mockResolvedValue([updated]),
      })),
    }));
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    const insert = vi.fn((table: unknown) => ({
      values: vi.fn((value: unknown) => {
        inserted.push({ table, value });
        return Promise.resolve();
      }),
    }));
    const transaction = {
      insert,
      update: vi.fn(() => ({ set })),
    } as never;

    const result = await persistWorkflowTaskTransition(transaction, {
      actorId: updated.assignedUserId,
      correlationId: "33333333-3333-4333-8333-333333333333",
      currentStatus: "IN_PROGRESS",
      occurredAt: completedAt,
      rowVersion: 3,
      stageInstanceId: "55555555-5555-4555-8555-555555555555",
      targetStatus: "COMPLETED",
      taskId: updated.id,
      workflowInstanceId: "44444444-4444-4444-8444-444444444444",
    });

    expect(result?.completedAt).toEqual(completedAt);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({
      completedAt,
      rowVersion: 4,
      status: "COMPLETED",
    }));
    expect(inserted).toEqual(expect.arrayContaining([
      {
        table: workflowEvents,
        value: expect.objectContaining({ eventCode: "TASK_COMPLETED" }),
      },
      {
        table: workflowAuditEntries,
        value: expect.objectContaining({
          action: "TASK_COMPLETED",
          before: { rowVersion: 3, status: "IN_PROGRESS" },
          stageInstanceId: "55555555-5555-4555-8555-555555555555",
          taskId: updated.id,
          targetType: "WORKFLOW_TASK",
          workflowInstanceId: "44444444-4444-4444-8444-444444444444",
        }),
      },
    ]));
  });
});
