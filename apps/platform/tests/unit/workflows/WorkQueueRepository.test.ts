import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkQueue } from "@/modules/workflows/infrastructure/WorkQueueRepository";

const execute = vi.fn();
const actorId = "20000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("work queue funding call projection", () => {
  it.each(["Database funding call", null])(
    "returns the projected funding call title %s",
    async (fundingCallTitle) => {
      execute.mockResolvedValue({
        rows: [
          {
            claimedAt: null,
            createdAt: "2026-09-15T08:00:00.000Z",
            dueAt: null,
            fundingCallTitle,
            taskInstanceId: "10000000-0000-4000-8000-000000000001",
            totalCount: 1,
          },
        ],
      });

      const queue = await readWorkQueue(actorId, { limit: 25, scope: "mine" });

      expect(queue.items[0].fundingCallTitle).toBe(fundingCallTitle);
      const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
      const fundingCallProjection = query.sql.match(
        /CASE WHEN (?:(?!CASE WHEN)[\s\S])*?AS "fundingCallTitle"/,
      );
      expect(fundingCallProjection?.[0]).toContain("task.assigned_user_id =");
      expect(fundingCallProjection?.[0]).toContain(
        "app_workflow_task_coi_cleared(task.id,",
      );
      expect(fundingCallProjection?.[0]).toContain(
        "THEN application.funding_opportunity_title",
      );
      expect(fundingCallProjection?.[0]).toContain(
        'ELSE NULL END AS "fundingCallTitle"',
      );
      expect(query.params).toContain(actorId);
      expect(query.sql).toContain("COI declaration required");
      expect(query.sql).toContain("COI disclosure awaiting independent review");
      expect(query.sql).toContain("prerequisite_definition.completion_mode");
      expect(query.sql).toContain("prerequisite_definition.required = TRUE");
      expect(query.sql).not.toContain("Hidden until COI reviewed");
    },
  );
});

it("includes the original assignee's active manual escalations without routing task actions to them", async () => {
  execute.mockResolvedValue({ rows: [] });
  await readWorkQueue(actorId, { limit: 25, scope: "mine" });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
  expect(query.sql).toContain("escalation.source_assigned_user_id =");
  expect(query.sql).toContain("escalation.escalated_by =");
  expect(query.sql).toContain(
    "escalation.status = 'ACTIVE' AND escalation.trigger = 'MANUAL'",
  );
  expect(query.sql).toContain("OR outgoing.id IS NOT NULL");
  expect(query.sql).toContain("THEN 'ESCALATED'");
  expect(query.sql).toContain('AS "outgoingEscalation"');
  expect(query.params).toContain("workflow.escalation.own.cancel");
  expect(query.sql).toContain("response.status = 'COMPLETED'");
});
