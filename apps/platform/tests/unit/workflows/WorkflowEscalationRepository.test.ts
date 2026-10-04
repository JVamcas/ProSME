import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowControlRepository", () => ({
  appendControlRecords: vi.fn(),
}));

import {
  resolveCompletedTaskEscalation,
  startWorkflowEscalation,
} from "@/modules/workflows/infrastructure/WorkflowEscalationRepository";
import { appendControlRecords } from "@/modules/workflows/infrastructure/WorkflowControlRepository";

it("preserves the previous assignment and resets the transferred task to Pending", async () => {
  const previous = {
    assignedRoleId: "old-role",
    assignedUserId: "old-user",
    status: "IN_PROGRESS",
  };
  const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
  const values = vi.fn(() => ({
    returning: vi.fn().mockResolvedValue([{ id: "escalation" }]),
  }));
  const limit = vi.fn().mockResolvedValue([previous]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const transaction = {
    execute: vi.fn().mockResolvedValue({ rows: [{ id: "parent-escalation" }] }),
    select: vi.fn(() => ({ from })),
    insert: vi.fn(() => ({ values })),
    update: vi.fn(() => ({ set })),
  } as never;

  await startWorkflowEscalation(transaction, {
    actionExecutionId: "execution",
    actorId: "old-user",
    assignedUserId: "new-user",
    configuration: {
      blockUntilResolved: true,
      responsibility: "TRANSFER",
      targetType: "ROLE",
      targetId: "new-role",
      trigger: "MANUAL",
    },
    correlationId: "correlation",
    stageInstanceId: "stage",
    taskId: "task",
    workflowInstanceId: "workflow",
  });

  expect(values).toHaveBeenCalledWith(
    expect.objectContaining({
      parentEscalationId: "parent-escalation",
      sourceAssignedRoleId: "old-role",
      sourceAssignedUserId: "old-user",
    }),
  );
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({
      assignedRoleId: "new-role",
      assignedUserId: "new-user",
      completedAt: null,
      startedAt: null,
      status: "PENDING",
    }),
  );
  expect(appendControlRecords).toHaveBeenCalledWith(
    transaction,
    expect.objectContaining({
      action: "TASK_REASSIGNED",
      before: previous,
      after: expect.objectContaining({
        assignedRoleId: "new-role",
        assignedUserId: "new-user",
        assignmentStatus: "REASSIGNED",
        status: "PENDING",
      }),
    }),
  );
});

describe("missing escalation source task", () => {
  it("does not write an escalation for a missing source", async () => {
    const insert = vi.fn();
    const limit = vi.fn().mockResolvedValue([]);
    const where = vi.fn(() => ({ limit }));
    const from = vi.fn(() => ({ where }));
    const transaction = {
      select: vi.fn(() => ({ from })),
      insert,
    } as never;
    const result = await startWorkflowEscalation(transaction, {} as never);
    expect(result).toBeNull();
    expect(insert).not.toHaveBeenCalled();
  });
});

it("resolves only the current assignee's completed task and writes resolution history", async () => {
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  await resolveCompletedTaskEscalation({ execute } as never, {
    actorId: "new-assignee",
    correlationId: "completion",
    taskId: "task",
  });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("task.assigned_user_id =");
  expect(query.sql).toContain("task.status = 'COMPLETED'");
  expect(query.sql).toContain("escalation.status = 'ACTIVE'");
  expect(query.sql).toContain("WORKFLOW_ESCALATION_RESOLVED");
  expect(query.sql).toContain("app_workflow_audit_entries");
  expect(query.params).toContain("new-assignee");
  expect(query.params).toContain("task");
});
