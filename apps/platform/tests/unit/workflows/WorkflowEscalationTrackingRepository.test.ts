import { PgDialect } from "drizzle-orm/pg-core";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/db/client";
import { readOwnEscalationTracking } from "@/modules/workflows/infrastructure/WorkflowEscalationTrackingRepository";
it("scopes tracking to the sender's active manual escalation and enforces COI and commitment", async () => {
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  await expect(readOwnEscalationTracking("actor", "task")).resolves.toBeNull();
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("escalation.source_assigned_user_id =");
  expect(query.sql).toContain("escalation.escalated_by =");
  expect(query.sql).toContain(
    "escalation.trigger = 'MANUAL' AND escalation.status = 'ACTIVE'",
  );
  expect(query.sql).toContain("app_workflow_task_coi_cleared(task.id,");
  expect(query.sql).toContain(
    "response.completed_at >= escalation.escalated_at",
  );
  expect(query.params).toContain("workflow.escalation.own.cancel");
});
