import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { listForms } from "@/modules/forms/infrastructure/FormRepository";

const execute = vi.fn();
const dialect = new PgDialect();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  execute
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ total: 23 }] });
});

describe("form catalogue search projection", () => {
  it("filters both the paged projection and total using the displayed latest metadata", async () => {
    const result = await listForms({
      page: 2,
      pageSize: 10,
      search: " Review ",
    });
    const [page, count] = execute.mock.calls.map(([query]) =>
      dialect.sqlToQuery(query),
    );
    for (const query of [page, count]) {
      expect(query.sql).toContain("ORDER BY version_number DESC");
      for (const property of ["name", "code", "description"]) {
        expect(query.sql).toContain(
          `coalesce(latest.metadata->>'${property}', definition.${property}) ILIKE`,
        );
      }
      expect(query.params.slice(0, 3)).toEqual([
        "%Review%",
        "%Review%",
        "%Review%",
      ]);
      expect(query.sql).not.toContain("SELECT *");
    }
    expect(page.sql).toContain("ORDER BY name ASC, definition.id ASC");
    expect(page.params.slice(-2)).toEqual([10, 10]);
    expect(count.sql).not.toContain("field_counts");
    expect(result).toEqual({
      items: [],
      page: 2,
      pageSize: 10,
      total: 23,
      totalPages: 3,
    });
  });

  it("treats percent, underscore and backslash as literal search characters", async () => {
    await listForms({ page: 1, pageSize: 10, search: "50%_\\" });
    const query = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params[0]).toBe("%50\\%\\_\\\\%");
  });

  it("omits the search predicate for blank queries and retains pagination", async () => {
    await listForms({ page: 3, pageSize: 5, search: "  " });
    const queries = execute.mock.calls.map(([query]) =>
      dialect.sqlToQuery(query),
    );
    expect(queries.every((query) => !query.sql.includes("ILIKE"))).toBe(true);
    expect(queries[0].params).toEqual([5, 10]);
    expect(queries[1].params).toEqual([]);
  });
});
