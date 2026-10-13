import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
import { getDatabase } from "@/db/client";
import { readFormSearchContent } from "@/modules/forms/infrastructure/FormSearchRepository";
const execute = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});
describe("form search content projection", () => {
  it("does not query for an empty set", async () => {
    expect(await readFormSearchContent([])).toEqual([]);
    expect(execute).not.toHaveBeenCalled();
  });
  it("loads exact versions and their ordered sections, fields and options in one parameterized read", async () => {
    const rows = [
      { versionId: "version", name: "Review", description: "", sections: [] },
    ];
    execute.mockResolvedValue({ rows });
    expect(await readFormSearchContent(["version", "other"])).toEqual(rows);
    expect(execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toEqual(["version", "other"]);
    expect(query.sql).toContain("WHERE v.id IN");
    expect(query.sql).toContain('d.id AS "definitionId"');
    expect(query.sql).toContain('v.version_number AS "versionNumber"');
    expect(query.sql).toContain("ORDER BY s.display_order");
    expect(query.sql).toContain("ORDER BY f.display_order");
    expect(query.sql).toContain("ORDER BY o.display_order");
    expect(query.sql).toContain("o.field_id = f.id");
    expect(query.sql).not.toContain("SELECT *");
  });
});
