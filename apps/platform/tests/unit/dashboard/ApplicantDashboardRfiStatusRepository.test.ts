import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readApplicantDashboard } from "@/modules/dashboard/infrastructure/ApplicantDashboardRepository";

const execute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  execute.mockResolvedValue({
    rows: [{
      actionRequired: 0,
      activities: [],
      applicationsInProgress: 0,
      openFundingOpportunities: 0,
      submittedApplications: 0,
    }],
  });
  vi.mocked(getDatabase).mockReturnValue({ execute } as never);
});

describe("applicant dashboard RFI status projection", () => {
  it("counts an owner-scoped open RFI as action required", async () => {
    await readApplicantDashboard("10000000-0000-4000-8000-000000000001");

    const rendered = new PgDialect().sqlToQuery(execute.mock.calls[0]![0]);

    expect(rendered.sql).toContain("app_workflow_rfis open_rfi");
    expect(rendered.sql).toContain("open_rfi.recipient_user_id");
    expect(rendered.sql).toContain("open_rfi.status = 'OPEN'");
    expect(rendered.sql).toContain(
      "(has_open_rfi OR applicant_status = 'ACTION_REQUIRED')",
    );
  });
});
