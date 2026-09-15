import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { AdminDashboard } from "@/components/admin/dashboard/AdminDashboard";
import type { AdminDashboardView } from "@/modules/dashboard/AdminDashboardTypes";

const dashboard: AdminDashboardView = {
  activities: [
    {
      actorName: "Applicant User",
      applicationId: "99e20de0-3558-4d63-90a4-8c9f5125df07",
      applicationReference: "SMEF-2026-000001",
      eventCode: "APPLICATION_SUBMITTED",
      occurredAt: "2026-09-15T08:00:00.000Z",
    },
  ],
  metrics: {
    informationRequests: null,
    pendingDecision: 2,
    totalApplications: 5,
    underReview: 3,
  },
  period: "30",
  statuses: [
    { count: 3, label: "Completeness screening" },
    { count: 2, label: "Committee decision" },
  ],
  visibility: "all",
};

describe("admin dashboard", () => {
  it("renders database projection values and marks unavailable data", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard dashboard={dashboard} />,
    );
    expect(markup).toContain("Total applications");
    expect(markup).toContain("Under review");
    expect(markup).toContain("Pending decision");
    expect(markup).toContain("SMEF-2026-000001");
    expect(markup).toContain("Application submitted");
    expect(markup).toContain("Request tracking is not available yet");
    expect(markup).toContain('id="period"');
    expect(markup).not.toContain("128");
  });

  it("renders truthful empty states", () => {
    const markup = renderToStaticMarkup(
      <AdminDashboard
        dashboard={{
          ...dashboard,
          activities: [],
          metrics: {
            ...dashboard.metrics,
            pendingDecision: 0,
            totalApplications: 0,
            underReview: 0,
          },
          statuses: [],
        }}
      />,
    );
    expect(markup).toContain("No submitted applications exist");
    expect(markup).toContain("No workflow activity exists");
  });
});
