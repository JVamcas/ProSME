import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readAdminDashboard } from "@/modules/dashboard/infrastructure/AdminDashboardRepository";
import { readAdminApplications } from "@/modules/applications/infrastructure/AdminApplicationRepository";

const execute = vi.fn();
const dialect = new PgDialect();
const actorId = "20000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  execute.mockResolvedValue({ rows: [{
    activities: [], statuses: [], informationRequests: 0, pendingDecision: 0,
    totalApplications: 0, underReview: 0,
  }] });
});

describe("dashboard SQL reporting periods and drilldowns", () => {
  it("bounds applications in SQL before aggregation, status grouping and activity pagination", async () => {
    const since = new Date("2026-09-12T10:00:00Z");
    const until = new Date("2026-10-12T10:00:00Z");
    await readAdminDashboard({ actorId, since, until, visibility: "assigned" });
    const query = dialect.sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("application.submitted_at >=");
    expect(query.sql).toContain("application.submitted_at <=");
    expect(query.sql.indexOf("application.submitted_at >="))
      .toBeLessThan(query.sql.indexOf("status_counts AS"));
    expect(query.sql).toContain("assigned_task.assigned_user_id");
    expect(query.sql).toContain("GROUP BY COALESCE(stage_name, 'Submitted')");
    expect(query.sql).toContain("LIMIT 6");
    expect(query.sql).toContain("WHERE applicant_status = 'ACTION_REQUIRED'");
    expect(query.sql).toContain("WHERE pending_decision");
    expect(query.params).toContain(since);
    expect(query.params).toContain(until);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("omits the lower time bound for all time and denies unscoped reads in SQL", async () => {
    await readAdminDashboard({ actorId, since: null, until: new Date(), visibility: "none" });
    const query = dialect.sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).not.toContain("application.submitted_at >=");
    expect(query.sql).toContain("AND FALSE");
  });

  it("uses configured decision actions in both dashboard counts and application filtering", async () => {
    await readAdminDashboard({ actorId, since: null, until: new Date(), visibility: "all" });
    execute.mockResolvedValueOnce({ rows: [] });
    await readAdminApplications({
      actorId, visibility: "assigned",
      filters: {
        limit: 25, status: "pending-decision",
        submittedAfter: "2026-09-12T10:00:00Z",
        submittedBefore: "2026-10-12T10:00:00Z",
      },
    });
    const dashboardQuery = dialect.sqlToQuery(execute.mock.calls[0]![0]);
    const listQuery = dialect.sqlToQuery(execute.mock.calls[1]![0]);
    for (const query of [dashboardQuery, listQuery]) {
      expect(query.sql).toContain("action.action_type IN ('APPROVE_ADVANCE', 'REJECT')");
      expect(query.sql).toContain("decision_task.status IN ('PENDING', 'IN_PROGRESS')");
      expect(query.sql).toContain("decision_stage.status IN ('ACTIVE', 'BLOCKED')");
    }
    expect(listQuery.params).toContain("2026-09-12T10:00:00Z");
    expect(listQuery.params).toContain("2026-10-12T10:00:00Z");
    expect(listQuery.sql).toContain("application.submitted_at <=");
    expect(listQuery.sql).toContain('ORDER BY "submittedAt" DESC, "applicationId" DESC');
  });
});
