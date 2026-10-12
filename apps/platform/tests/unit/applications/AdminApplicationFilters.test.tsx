import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { z } from "zod";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/modules/applications/ui/useApplications", () => ({
  useAdminApplications: vi.fn(() => ({ data: { items: [], total: 0 } })),
}));

import { useAdminApplications } from "@/modules/applications/ui/useApplications";

import { getDatabase } from "@/db/client";
import { adminApplicationFormSchema, adminApplicationListSchema } from "@/modules/applications/api/AdminApplicationSchemas";
import { readAdminApplications } from "@/modules/applications/infrastructure/AdminApplicationRepository";
import { ApplicationFilterFields } from "@/modules/applications/ui/staff/ApplicationFilterFields";
import { StaffApplicationsTable } from "@/modules/applications/ui/staff/StaffApplicationsTable";

const execute = vi.fn().mockResolvedValue({ rows: [] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

function Fields() {
  const form = useForm<z.input<typeof adminApplicationFormSchema>>();
  return <ApplicationFilterFields register={form.register} />;
}

describe("staff application filters", () => {
  it("accepts combined filters and leaves empty age bounds unset", () => {
    expect(adminApplicationListSchema.parse({ ageMin: "", ageMax: "" }))
      .toMatchObject({ ageMin: undefined, ageMax: undefined, status: "all" });
    expect(adminApplicationListSchema.parse({
      ageMin: "18", ageMax: "35", gender: "Female", region: "Khomas",
      sector: "Blue economy", status: "under-review",
      submittedFrom: "2026-10-01", submittedTo: "2026-10-12",
    })).toMatchObject({ ageMin: 18, ageMax: 35 });
  });

  it.each([
    { ageMin: "36", ageMax: "18" },
    { ageMin: "-1" },
    { ageMax: "1.5" },
    { ageMin: " " },
    { gender: "invalid" },
    { submittedAfter: "invalid" },
    { submittedAfter: "2026-10-12T10:00:00Z", submittedBefore: "2026-10-01T10:00:00Z" },
    { submittedFrom: "2026-02-30" },
    { submittedTo: "12 October 2026" },
    { submittedFrom: "2026-10-12", submittedTo: "2026-10-01" },
  ])("rejects invalid filters %j", (input) => {
    expect(adminApplicationListSchema.safeParse(input).success).toBe(false);
  });

  it("renders every requested filter and removes the status tabs", () => {
    const fields = renderToStaticMarkup(<Fields />);
    for (const name of [
      "ageMin", "ageMax", "gender", "region", "sector", "status",
      "submittedFrom", "submittedTo",
    ]) {
      expect(fields).toContain(`name="${name}"`);
    }
    const table = renderToStaticMarkup(<StaffApplicationsTable />);
    expect(table).not.toContain('role="tab"');
    expect(table).not.toContain('whitespace-nowrap border-b-2');
    expect(table).toContain("All statuses");
  });

  it("opens dashboard links with their status and exact server-side reporting window applied", () => {
    const initialFilters = {
      limit: 25,
      status: "pending-decision" as const,
      submittedAfter: "2026-09-12T10:00:00Z",
      submittedBefore: "2026-10-12T10:00:00Z",
      submittedFrom: "2026-09-12",
      submittedTo: "2026-10-12",
    };
    const markup = renderToStaticMarkup(<StaffApplicationsTable initialFilters={initialFilters} />);
    expect(useAdminApplications).toHaveBeenCalledWith(expect.objectContaining(initialFilters));
    expect(markup).toContain('value="pending-decision"');
    expect(markup).toContain('name="submittedFrom"');
    expect(markup).toContain('name="submittedTo"');
  });

  it("combines filters before SQL counting and cursor pagination with assignment scope", async () => {
    await readAdminApplications({
      actorId: "20000000-0000-4000-8000-000000000002",
      visibility: "assigned",
      cursor: { id: "10000000-0000-4000-8000-000000000001", submittedAt: new Date("2026-10-05T12:00:00Z") },
      filters: {
        limit: 10, status: "under-review", ageMin: 18, ageMax: 35,
        gender: "Female", region: "Khomas", sector: "Blue economy",
        submittedFrom: "2026-10-01", submittedTo: "2026-10-12",
      },
    });
    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("snapshot.id = application.submission_snapshot_id");
    expect(query.sql).toContain("EXTRACT(YEAR FROM age(");
    expect(query.sql).toContain("'applicant'->>'gender'");
    expect(query.sql).toContain("AT TIME ZONE 'Africa/Windhoek'");
    expect(query.sql).toContain("::date + 1");
    expect(query.sql).toContain("visible_task.assigned_user_id");
    expect(query.sql).toContain('ORDER BY "submittedAt" DESC, "applicationId" DESC');
    expect(query.params).toEqual(expect.arrayContaining([
      18, 35, "Female", "Khomas", "Blue economy", "UNDER_REVIEW",
      "2026-10-01", "2026-10-12", 11,
    ]));
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
