import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  adminApplicationQuery,
  parseAdminApplicationQuery,
} from "@/modules/applications/api/AdminApplicationQuery";
import {
  adminApplicationListSchema,
  adminApplicationExportSchema,
} from "@/modules/applications/api/AdminApplicationSchemas";
import { readAdminApplications } from "@/modules/applications/infrastructure/AdminApplicationRepository";
import { getDatabase } from "@/db/client";
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
const execute = vi.fn();
const selections = {
  fundingCallId: [
    "30000000-0000-4000-8000-000000000003",
    "30000000-0000-4000-8000-000000000004",
  ],
  stage: ["Screening", "Decision"],
  gender: ["Female", "Male"],
  region: ["Khomas", "Erongo"],
  sector: ["Blue economy", "Tourism"],
  status: ["under-review", "pending-decision"] as const,
};
function filters() {
  return { ...selections, status: [...selections.status] };
}
beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue({ rows: [] });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});
it("round trips every selection through list and export transport", () => {
  const query = adminApplicationQuery(filters());
  const input = parseAdminApplicationQuery(query);
  expect(adminApplicationListSchema.parse(input)).toMatchObject(filters());
  expect(
    adminApplicationExportSchema.parse({ ...input, format: "CSV" }),
  ).toMatchObject(filters());
  for (const key of Object.keys(selections)) {
    expect(query.getAll(key)).toHaveLength(2);
  }
});
it("combines SQL membership filters and status alternatives before pagination", async () => {
  await readAdminApplications({
    actorId: "20000000-0000-4000-8000-000000000002",
    visibility: "assigned",
    filters: { ...filters(), limit: 25 },
  });
  const query = new PgDialect().sqlToQuery(execute.mock.calls[0][0]);
  expect(query.sql).toContain("stage_definition.name IN (");
  expect(query.sql).toContain("application.funding_opportunity_id IN (");
  expect(query.sql).toContain(" OR ");
  expect(query.sql).toContain("visible_task.assigned_user_id");
  expect(query.sql).toContain(
    'ORDER BY "submittedAt" DESC, "applicationId" DESC',
  );
  expect(query.params).toEqual(
    expect.arrayContaining([
      ...selections.fundingCallId,
      ...selections.stage,
      ...selections.gender,
      "khomas",
      "erongo",
      "blue economy",
      "tourism",
      "UNDER_REVIEW",
      26,
    ]),
  );
});
it("accepts empty selections as unrestricted and rejects invalid array entries", () => {
  const empty = Object.fromEntries(
    Object.keys(selections).map((key) => [key, []]),
  );
  expect(adminApplicationListSchema.safeParse(empty).success).toBe(true);
  expect(
    adminApplicationListSchema.safeParse({ status: ["closed", "invalid"] })
      .success,
  ).toBe(false);
  expect(
    adminApplicationListSchema.safeParse({
      fundingCallId: [selections.fundingCallId[0], "invalid"],
    }).success,
  ).toBe(false);
});
