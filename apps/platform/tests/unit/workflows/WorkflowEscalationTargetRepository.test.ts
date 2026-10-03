import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readWorkflowEscalationTargets } from "@/modules/workflows/infrastructure/WorkflowEscalationTargetRepository";

it("projects eligible task destinations with permissions, COI and assignment exclusions in SQL", async () => {
  const targets = [{ id: "user", label: "Reviewer", targetType: "USER" }];
  const execute = vi.fn().mockResolvedValue({ rows: targets });
  const taskId = "10000000-0000-4000-8000-000000000001";
  await expect(
    readWorkflowEscalationTargets({ execute } as never, taskId),
  ).resolves.toEqual(targets);
  expect(execute).toHaveBeenCalledTimes(1);
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.params).toEqual([taskId, taskId]);
  expect(query.sql).toContain("candidate.status = 'active'");
  expect(query.sql).toContain("candidate.id <> application.owner_user_id");
  expect(query.sql).toContain(
    "clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')",
  );
  expect(query.sql).toContain("permission.code = required.code");
  expect(query.sql).toContain(
    "peer.workflow_task_definition_id = task.workflow_task_definition_id",
  );
  expect(query.sql).toContain("role.id IS DISTINCT FROM");
  expect(query.sql).toContain("SELECT DISTINCT 'ROLE' AS \"targetType\"");
  expect(query.sql).toContain('ORDER BY "targetType", label, id');
  expect(query.sql).not.toContain("SELECT candidate.*");
});
