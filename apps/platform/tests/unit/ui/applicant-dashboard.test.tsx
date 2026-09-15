import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApplicantDashboard } from "@/components/applicant/dashboard/ApplicantDashboard";
import { ApplicantRecentActivity } from "@/components/applicant/dashboard/ApplicantRecentActivity";

describe("P3.1 applicant dashboard", () => {
  it("renders the approved hierarchy with truthful empty states", () => {
    const markup = renderToStaticMarkup(
      <ApplicantDashboard
        activities={[
          {
            applicationId: "application-1",
            applicationReference: "SMEF-2026-000001",
            eventCode: "APPLICATION_SUBMITTED",
            fundingOpportunityTitle: "Youth Enterprise Fund",
            occurredAt: "2026-09-15T10:30:00.000Z",
          },
        ]}
        displayName="Anna Ndeitunga"
        metrics={{
          actionRequired: 2,
          applicationsInProgress: 1,
          openFundingOpportunities: 3,
          submittedApplications: 4,
        }}
      />,
    );

    expect(markup).toContain("Welcome back, Anna Ndeitunga");
    expect(markup).toContain("Application status");
    expect(markup).toContain("Applications in progress");
    expect(markup).toContain("1 active application");
    expect(markup).toContain("4 submitted applications");
    expect(markup).toContain("2 applications need attention");
    expect(markup).toContain("Funding opportunities");
    expect(markup).toContain("3 open funding opportunities");
    expect(markup).toContain(
      'href="/portal/funding-opportunities?status=open"',
    );
    expect(markup.match(/href="\/portal\/applications"/g)).toHaveLength(3);
    expect(markup).toContain("Recent activity");
    expect(markup).toContain("Application submitted");
    expect(markup).toContain("Youth Enterprise Fund");
    expect(markup).toContain("SMEF-2026-000001");
    expect(markup).not.toContain("No recent activity yet");
    expect(markup).not.toContain("Profile readiness");
    expect(markup).not.toContain("Your details");
    expect(markup).not.toContain("object-cover");
    expect(markup).toContain("text-brand-orange");
    expect(markup).not.toContain("P3.2");
  });

  it("keeps the truthful empty state when no activity exists", () => {
    const markup = renderToStaticMarkup(
      <ApplicantRecentActivity activities={[]} />,
    );

    expect(markup).toContain("No recent activity yet");
    expect(markup).toContain(
      "Application updates will appear here when they become available.",
    );
  });
});
