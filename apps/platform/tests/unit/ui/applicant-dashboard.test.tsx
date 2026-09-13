import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ApplicantDashboard } from "@/components/dashboard/applicant-dashboard";

describe("P3.1 applicant dashboard", () => {
  it("renders the approved hierarchy with truthful empty states", () => {
    const markup = renderToStaticMarkup(
      <ApplicantDashboard
        completion={{
          applicantProfile: true,
          businessProfile: false,
        }}
        displayName="Anna Ndeitunga"
      />,
    );

    expect(markup).toContain("Welcome back, Anna Ndeitunga");
    expect(markup).toContain("Application status");
    expect(markup).toContain("Applications in progress");
    expect(markup).toContain("Funding opportunities");
    expect(markup).toContain("Recent activity");
    expect(markup).toContain("No recent activity yet");
    expect(markup).not.toContain("Profile readiness");
    expect(markup).not.toContain("Your details");
    expect(markup).toContain("object-contain object-right");
    expect(markup).not.toContain("object-cover");
    expect(markup).toContain("text-brand-orange");
    expect(markup).not.toContain("P3.2");
  });
});
