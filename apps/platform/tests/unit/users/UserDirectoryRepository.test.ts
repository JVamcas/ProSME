import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { listUserDirectory } from "@/modules/users/infrastructure/UserDirectoryRepository";

const execute = vi.fn();
const dialect = new PgDialect();

beforeEach(() => {
  execute.mockReset();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("Users directory projection", () => {
  it("filters, orders, and paginates the combined directory in SQL", async () => {
    execute.mockResolvedValue({
      rows: [{
        id: "firebase:uid-1",
        email: "new@example.test",
        display_name: "New Person",
        email_verified: false,
        last_login_at: null,
        role_codes: [],
        capability_codes: [],
        status: "unprovisioned",
        user_type: null,
        total: 3,
      }],
    });
    const result = await listUserDirectory(
      {
        limit: 1,
        page: 2,
        role: "programme_officer",
        search: "new",
        sort: "email-desc",
        status: "unprovisioned",
      },
      [{
        uid: "uid-1",
        email: "new@example.test",
        displayName: "New Person",
        emailVerified: false,
        disabled: false,
        lastLoginAt: null,
      }],
    );
    const query = dialect.sqlToQuery(execute.mock.calls[0][0]);
    expect(query.sql).toContain("jsonb_to_recordset");
    expect(query.sql).toContain("ORDER BY email DESC, id DESC");
    expect(query.sql).toContain("LIMIT");
    expect(query.sql).toContain("OFFSET");
    expect(query.sql).toContain("lower(u.email) = lower(f.email)");
    expect(query.params).toContain("programme_officer");
    expect(query.params).toContain("new");
    expect(result).toMatchObject({
      total: 3,
      items: [{ id: "firebase:uid-1", status: "unprovisioned" }],
    });
  });

  it("retains the filtered total when the requested page is empty", async () => {
    execute.mockResolvedValue({ rows: [{ id: null, total: 9 }] });
    await expect(listUserDirectory(
      { limit: 8, page: 3, sort: "name-asc" },
      [],
    )).resolves.toEqual({ items: [], total: 9 });
  });
});
