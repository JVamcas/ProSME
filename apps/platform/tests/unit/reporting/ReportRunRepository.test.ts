import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/platform/database/client";
import { listReportRuns } from "@/modules/reporting/infrastructure/ReportRunRepository";

const execute = vi.fn();
const dialect = new PgDialect();
const reportId = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  execute.mockReset();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("report run list projection", () => {
  it("joins the triggering person's name and email in the paginated query", async () => {
    const row = {
      id: "run",
      actorId: "person",
      actorName: "Jane Smith",
      actorEmail: "jane@example.test",
      status: "SUCCEEDED",
    };
    execute
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ total: 21 }] });

    const result = await listReportRuns(
      reportId,
      { search: "SUCCEEDED", page: 2, pageSize: 10 },
      ["application-data/1"],
    );
    expect(result).toEqual({ items: [row], total: 21, page: 2, pageSize: 10 });
    expect(execute).toHaveBeenCalledTimes(2);
    const query = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(query.sql).toContain('actor.display_name AS "actorName"');
    expect(query.sql).toContain('actor.email AS "actorEmail"');
    expect(query.sql).toContain("INNER JOIN app_users actor ON actor.id = run.actor_id");
    expect(query.sql).toContain("ORDER BY run.created_at DESC, run.id DESC");
    expect(query.sql).not.toContain("SELECT *");
    expect(query.params.slice(-2)).toEqual([10, 10]);

    for (const [statement] of execute.mock.calls) {
      const scoped = dialect.sqlToQuery(statement);
      expect(scoped.sql).toContain("run.report_id =");
      expect(scoped.sql).toContain("run.status ILIKE");
      expect(scoped.sql).toContain("run.definition->>'datasetKey'");
      expect(scoped.sql).toContain("run.definition->>'datasetVersion'");
      expect(scoped.sql).toContain("ANY(");
      expect(scoped.params).toEqual(expect.arrayContaining([
        reportId,
        "%SUCCEEDED%",
        ["application-data/1"],
      ]));
    }
  });

  it("keeps the total when a page is beyond the last run", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });
    await expect(listReportRuns(
      reportId,
      { search: "", page: 2, pageSize: 10 },
      ["application-data/1"],
    )).resolves.toEqual({ items: [], total: 1, page: 2, pageSize: 10 });
  });

  it("retains an empty dataset authorization scope in both queries", async () => {
    execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: 0 }] });
    await expect(listReportRuns(
      reportId,
      { search: "", page: 1, pageSize: 10 },
      [],
    )).resolves.toMatchObject({ items: [], total: 0 });
    for (const [statement] of execute.mock.calls) {
      const query = dialect.sqlToQuery(statement);
      expect(query.sql).toContain("ANY(");
      expect(query.params).toContainEqual([]);
    }
    const query = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params.slice(-2)).toEqual([10, 0]);
  });
});
