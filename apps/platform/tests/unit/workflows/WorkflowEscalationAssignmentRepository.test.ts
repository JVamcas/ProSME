import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { loadEscalationAssignmentContext } from "@/modules/workflows/infrastructure/WorkflowEscalationAssignmentRepository";

it("loads the locked task and excludes existing reviewers in its own slot group", async () => {
  const context = {
    assignedRoleId: "role",
    assignedUserId: "previous-user",
    definitionId: "definition",
    excludedUserIds: ["previous-user", "peer-user"],
    name: "Review",
  };
  const execute = vi.fn().mockResolvedValue({ rows: [context] });
  const taskId = "10000000-0000-4000-8000-000000000001";
  await expect(loadEscalationAssignmentContext({ execute } as never, taskId)).resolves.toEqual(context);
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.params).toEqual([taskId]);
  expect(query.sql).toContain("FOR UPDATE OF task");
  expect(query.sql).toContain("peer.stage_instance_id = task.stage_instance_id");
  expect(query.sql).toContain("peer.workflow_task_definition_id = task.workflow_task_definition_id");
  expect(query.sql).toContain("peer.status <> 'CANCELLED'");
  expect(query.sql).not.toContain("SELECT task.*");
});
