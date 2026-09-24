import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const execute = vi.fn();
vi.mock("@/db/client", () => ({
  getDatabase: () => ({ execute }),
}));

import { readSelfAssignmentPool } from "@/modules/workflows/infrastructure/WorkflowSelfAssignmentPoolRepository";
import { readAssignmentHistory } from "@/modules/workflows/infrastructure/WorkflowAssignmentHistoryRepository";

const actorId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  execute.mockReset();
});

describe("self-assignment and history projections", () => {
  it("limits the pool to eligible work and omits protected details", async () => {
    execute.mockResolvedValue({ rows: [{
      total: 1,
      dueAt: new Date("2026-09-25T09:00:00Z"),
      rowVersion: 3,
      stageName: "Review",
      taskInstanceId: taskId,
      taskName: "Screen request",
    }] });
    const projection = await readSelfAssignmentPool(actorId, {
      limit: 1,
      search: "Screen",
    });
    expect(projection).toEqual({
      items: [{
        dueAt: "2026-09-25T09:00:00.000Z",
        rowVersion: 3,
        stageName: "Review",
        taskInstanceId: taskId,
        taskName: "Screen request",
      }],
      total: 1,
    });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("definition.assignment_mode = 'ROLE'");
    expect(query.sql).toContain("candidate.status = 'active'");
    expect(query.sql).toContain("application.owner_user_id <>");
    expect(query.sql).toContain("maxConcurrentAssignments");
    expect(query.sql).toContain("ORDER BY \"dueAt\" ASC NULLS LAST");
    expect(query.sql).not.toContain("application.reference");
    expect(query.sql).not.toContain("disclosure_text");
    expect(query.params).toContain(2);
  });

  it("uses a stable cursor and returns an empty bounded page", async () => {
    execute.mockResolvedValue({ rows: [{
      total: 0,
      dueAt: null,
      rowVersion: null,
      stageName: null,
      taskInstanceId: null,
      taskName: null,
    }] });
    const projection = await readSelfAssignmentPool(
      actorId,
      { limit: 10 },
      { dueAt: null, id: taskId },
    );
    expect(projection).toEqual({ items: [], total: 0 });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain('"taskInstanceId" >');
    expect(query.params).toContain(11);
  });

  it("returns only assignment facts ordered by audit sequence", async () => {
    execute.mockResolvedValue({ rows: [{
      action: "TASK_ASSIGNED",
      actorId,
      assignedUserId: actorId,
      occurredAt: new Date("2026-09-25T09:00:00Z"),
      previousUserId: null,
      reason: "Claimed",
      reviewerSlot: 1,
      sequence: "7",
      status: "CLAIMED",
      taskId,
      total: 1,
    }] });
    const projection = await readAssignmentHistory(taskId, {
      after: 6,
      limit: 10,
    });
    expect(projection.items[0]).toMatchObject({
      action: "TASK_ASSIGNED",
      assignedUserId: actorId,
      sequence: 7,
    });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("target.reviewer_slot = task.reviewer_slot");
    expect(query.sql).toContain("ORDER BY sequence ASC");
    expect(query.sql).not.toContain("disclosure_text");
    expect(query.sql).not.toContain("audit.after AS");
    expect(query.params).toContain(11);
  });
});
