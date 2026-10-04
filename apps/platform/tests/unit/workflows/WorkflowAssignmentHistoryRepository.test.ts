import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readAssignmentHistory } from "@/modules/workflows/infrastructure/WorkflowAssignmentHistoryRepository";

it("projects Reassigned history with the prior user and destination user and role", async () => {
  const execute = vi.fn().mockResolvedValue({ rows: [{
    action: "TASK_REASSIGNED",
    actorId: "previous-user",
    assignedRoleId: "new-role",
    assignedRoleName: "Review managers",
    assignedUserId: "new-user",
    assignedUserName: "New reviewer",
    occurredAt: "2026-10-03T10:00:00.000Z",
    previousUserId: "previous-user",
    reviewerSlot: 1,
    sequence: "7",
    status: "REASSIGNED",
    taskId: "task",
    total: 1,
  }] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  const history = await readAssignmentHistory("task", { after: 6, limit: 10 });
  expect(history.items[0]).toMatchObject({
    action: "TASK_REASSIGNED",
    assignedRoleId: "new-role",
    assignedRoleName: "Review managers",
    assignedUserId: "new-user",
    assignedUserName: "New reviewer",
    previousUserId: "previous-user",
    sequence: 7,
    status: "REASSIGNED",
  });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("'TASK_REASSIGNED'");
  expect(query.sql).toContain("COALESCE(audit.after ->> 'assignmentStatus'");
  expect(query.sql).toContain("ORDER BY sequence ASC");
  expect(query.params).toEqual(["task", 6, 11]);
});
