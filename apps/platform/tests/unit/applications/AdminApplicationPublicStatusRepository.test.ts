import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readAdminApplication } from "@/db/repositories/AdminApplicationRepository";

const execute = vi.fn();
const applicationId = "10000000-0000-4000-8000-000000000001";
const actorId = "20000000-0000-4000-8000-000000000002";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
  execute.mockResolvedValue({
    rows: [{
      applicantName: "Applicant",
      applicationId,
      businessName: "SME",
      businessType: null,
      coFunding: null,
      currentStageName: "Administrative and Eligibility Screening",
      industry: null,
      location: null,
      opportunityTitle: "Growth Grant",
      priority: null,
      reference: "SME-001",
      requestedAmount: null,
      stages: [],
      submittedAt: new Date("2026-09-24T12:00:00.000Z"),
      updatedAt: new Date("2026-09-24T13:00:00.000Z"),
      workflowStatus: "ACTIVE",
      terminalPublicStatus: null,
      activeStageStatuses: [{
        description: "Your application is being checked for completeness and eligibility.",
        label: "Application under assessment",
        status: "UNDER_REVIEW",
      }],
    }],
  });
});

describe("admin application public status read model", () => {
  it("projects published public labels and scopes the SQL to the assigned actor", async () => {
    const application = await readAdminApplication({
      actorId,
      applicationId,
      visibility: "assigned",
    });

    expect(application?.publicStatus).toEqual({
      actionRequired: false,
      description: "Your application is being checked for completeness and eligibility.",
      label: "Application under assessment",
      status: "UNDER_REVIEW",
    });
    expect(application?.updatedAt).toBe("2026-09-24T13:00:00.000Z");
    expect(application).not.toHaveProperty("activeStageStatuses");

    const query = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);
    expect(query.sql).toContain("active_definition.applicant_label");
    expect(query.sql).toContain("active_definition.applicant_description");
    expect(query.sql).toContain("visible_task.assigned_user_id");
    expect(query.params).toContain(actorId);
    expect(query.params).toContain(applicationId);
  });
});
