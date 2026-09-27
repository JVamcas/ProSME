import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import { appendWorkflowRfiLifecycleRecords } from "@/modules/workflows/infrastructure/WorkflowRfiLifecycleRecordsRepository";
import { workflowRfiLifecycleEvents } from "@/modules/workflows/infrastructure/workflow-rfi.schema";

describe("workflow RFI lifecycle records", () => {
  it("writes source-linked audit and event records in the transaction", async () => {
    const writes: { table: unknown; values: Record<string, unknown> }[] = [];
    const transaction = {
      insert: (table: unknown) => ({
        values: async (values: Record<string, unknown>) => {
          writes.push({ table, values });
        },
      }),
    };
    const occurredAt = new Date("2026-09-27T12:30:00.000Z");
    const source = {
      actionDefinitionId: "10000000-0000-4000-8000-000000000001",
      applicationId: "20000000-0000-4000-8000-000000000001",
      stageInstanceId: "30000000-0000-4000-8000-000000000001",
      taskId: "40000000-0000-4000-8000-000000000001",
      workflowInstanceId: "50000000-0000-4000-8000-000000000001",
    };

    await appendWorkflowRfiLifecycleRecords(transaction as never, {
      actorId: "60000000-0000-4000-8000-000000000001",
      correlationId: "70000000-0000-4000-8000-000000000001",
      fromStatus: "OPEN",
      nextRowVersion: 2,
      occurredAt,
      previousRowVersion: 1,
      requestInformationId: "80000000-0000-4000-8000-000000000001",
      source,
      toStatus: "RESPONDED",
    });

    expect(writes.map((write) => write.table)).toEqual([
      workflowRfiLifecycleEvents,
      workflowEvents,
      workflowAuditEntries,
      transactionalOutbox,
    ]);
    expect(writes[0]?.values).toMatchObject({
      actionDefinitionId: source.actionDefinitionId,
      applicationId: source.applicationId,
      fromStatus: "OPEN",
      occurredAt,
      stageInstanceId: source.stageInstanceId,
      taskId: source.taskId,
      toStatus: "RESPONDED",
      workflowInstanceId: source.workflowInstanceId,
    });
    expect(writes[1]?.values).toMatchObject({
      createdAt: occurredAt,
      eventCode: "RFI_RESPONDED",
      payload: expect.objectContaining({
        actorId: "60000000-0000-4000-8000-000000000001",
        occurredAt: occurredAt.toISOString(),
        source,
      }),
    });
    expect(writes[2]?.values).toMatchObject({
      after: { rowVersion: 2, status: "RESPONDED" },
      before: { rowVersion: 1, status: "OPEN" },
      createdAt: occurredAt,
    });
    expect(writes[3]?.values).toMatchObject({
      availableAt: occurredAt,
      createdAt: occurredAt,
      eventCode: "RFI_RESPONDED",
    });
  });
});
