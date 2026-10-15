import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { DatabaseTransaction } from "@/platform/database/client";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { findAppealApplication } from "@/modules/applications/infrastructure/ApplicationAppealRepository";

describe("appeal application lookup", () => {
  it("loads only the referenced application's owner contact in one bounded query", async () => {
    const applicant = {
      id: "10000000-0000-4000-8000-000000000001",
      reference: "APPLICATION-000001",
      name: "Application owner",
      email: "owner@example.test",
      phone: "",
    };
    const execute = vi.fn().mockResolvedValue({ rows: [applicant] });
    const transaction = { execute } as unknown as DatabaseTransaction;

    expect(
      await findAppealApplication(transaction, applicant.reference),
    ).toEqual(applicant);
    expect(execute).toHaveBeenCalledTimes(1);
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
    expect(query.params).toEqual([applicant.reference]);
    expect(query.sql).toContain("applicant.id = application.owner_user_id");
    expect(query.sql).toContain("LEFT JOIN app_applicant_profiles");
    expect(query.sql).toContain("profile.user_id = applicant.id");
    expect(query.sql).toContain("COALESCE(profile.phone_number, '')");
    expect(query.sql).toContain("WHERE application.reference = $1 LIMIT 1");
    expect(query.sql).not.toContain("SELECT *");
  });

  it("returns no applicant for an unknown application reference", async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [] });
    const transaction = { execute } as unknown as DatabaseTransaction;

    expect(await findAppealApplication(transaction, "UNKNOWN")).toBeUndefined();
  });
});
