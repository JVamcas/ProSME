import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowControlRepository", () => ({
  appendControlRecords: vi.fn(),
}));
import { appendControlRecords } from "@/modules/workflows/infrastructure/WorkflowControlRepository";
import {
  hasCommittedEscalationWork,
  lockEscalationCancellationContext,
  persistEscalationCancellation,
} from "@/modules/workflows/infrastructure/WorkflowEscalationCancellationRepository";
const dialect = new PgDialect();
it("locks stage and assignment before reading the escalation context", async () => {
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  await lockEscalationCancellationContext(
    { execute } as never,
    "task",
    "escalation",
  );
  const queries = execute.mock.calls.map(
    ([query]) => dialect.sqlToQuery(query).sql,
  );
  expect(queries[0]).toContain("FOR UPDATE OF stage");
  expect(queries[1]).toContain("FOR UPDATE OF task, escalation");
  expect(queries[1]).toContain(
    'source_assigned_user_id AS "sourceAssignedUserId"',
  );
});
it("distinguishes a committed new-assignee response from drafts or previous work", async () => {
  const execute = vi.fn().mockResolvedValue({ rows: [{ committed: true }] });
  await expect(
    hasCommittedEscalationWork({ execute } as never, "task", "escalation"),
  ).resolves.toBe(true);
  const query = dialect.sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).not.toContain(
    "response.respondent_user_id = task.assigned_user_id",
  );
  expect(query.sql).toContain("response.status = 'COMPLETED'");
  expect(query.sql).toContain(
    "response.completed_at >= escalation.escalated_at",
  );
});
it("restores the source assignment without deleting saved work and records both transfers", async () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockImplementation(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const execute = vi.fn();
  const context = {
    escalationId: "escalation",
    escalationStatus: "ACTIVE",
    escalatedBy: "source",
    trigger: "MANUAL",
    assignedUserId: "destination",
    assignedRoleId: "destination-role",
    sourceAssignedUserId: "source",
    sourceAssignedRoleId: "source-role",
    taskStatus: "IN_PROGRESS",
    rowVersion: 3,
    stageStatus: "ACTIVE",
    stageInstanceId: "stage",
    workflowStatus: "ACTIVE",
    workflowInstanceId: "workflow",
  };
  await persistEscalationCancellation({ update, execute } as never, context, {
    actorId: "source",
    correlationId: "correlation",
    taskId: "task",
  });
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({
      assignedUserId: "source",
      assignedRoleId: "source-role",
      status: "PENDING",
      rowVersion: 4,
    }),
  );
  expect(set.mock.calls[0]![0]).not.toHaveProperty("result");
  const cascade = dialect.sqlToQuery(execute.mock.calls[0]![0]);
  expect(cascade.sql).toContain("WITH RECURSIVE chain AS");
  expect(cascade.sql).toContain("child.parent_escalation_id = parent.id");
  expect(cascade.sql).toContain("WORKFLOW_ESCALATION_CANCELLED");
  expect(cascade.sql).toContain("cancelledFromEscalationId");
  expect(appendControlRecords).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      action: "TASK_REASSIGNED",
      before: expect.objectContaining({ assignedUserId: "destination" }),
      after: expect.objectContaining({
        assignedUserId: "source",
        assignmentStatus: "REASSIGNED",
      }),
    }),
  );
});
