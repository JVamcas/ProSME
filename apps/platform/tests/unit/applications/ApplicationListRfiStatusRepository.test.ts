import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readOwnedApplicationStatus } from "@/modules/applications/infrastructure/ApplicationListRepository";

const limit = vi.fn();
const query = {
  from: vi.fn(),
  leftJoin: vi.fn(),
  limit,
  where: vi.fn(),
};
const select = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  query.from.mockReturnValue(query);
  query.leftJoin.mockReturnValue(query);
  query.where.mockReturnValue(query);
  limit.mockResolvedValue([]);
  select.mockReturnValue(query);
  vi.mocked(getDatabase).mockReturnValue({ select } as never);
});

describe("applicant application-list RFI status projection", () => {
  it("selects an owner-scoped open-RFI flag for the public projection", async () => {
    await readOwnedApplicationStatus(
      "10000000-0000-4000-8000-000000000001",
      "20000000-0000-4000-8000-000000000002",
    );

    const columns = select.mock.calls[0]![0];
    const rendered = new PgDialect().sqlToQuery(columns.hasOpenRfi);

    expect(rendered.sql).toContain("app_workflow_rfis open_rfi");
    expect(rendered.sql).toContain("open_rfi.application_id");
    expect(rendered.sql).toContain("open_rfi.recipient_user_id");
    expect(rendered.sql).toContain("open_rfi.status = 'OPEN'");
  });
});
