import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FundingOpportunityCard } from "@/components/applicant/funding-opportunities/FundingOpportunityCard";

const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";

describe("funding opportunity card", () => {
  it("renders the CMS projection and internal detail link", () => {
    const markup = renderToStaticMarkup(
      <FundingOpportunityCard
        opportunity={{
          applicationsOpen: true,
          closesAt: "2026-10-31T21:59:59.000Z",
          fundingInstrument: "Grant",
          id: fundingOpportunityId,
          maximumAmount: 200000,
          minimumAmount: 50000,
          opensAt: "2026-09-01T00:00:00.000Z",
          reference: "GROWTH-2026",
          selfCheckAvailable: true,
          slug: "growth-fund",
          status: "open",
          summary: "Support for growing Namibian businesses.",
          thematicArea: "Growth",
          title: "Growth Fund",
          totalFundingAmount: 1000000,
        }}
      />,
    );

    expect(markup).toContain("Growth Fund");
    expect(markup).toContain("Support for growing Namibian businesses.");
    expect(markup).toContain("N$200,000");
    expect(markup).toContain('aria-label="Important date: Closes 31 Oct 2026"');
    expect(markup).toContain(
      `href="/portal/funding-opportunities/${fundingOpportunityId}"`,
    );
    expect(markup).toContain("Open");
  });

  it("renders an application action beside the detail link", () => {
    const markup = renderToStaticMarkup(
      <FundingOpportunityCard
        action={<button type="button">Apply</button>}
        opportunity={{
          applicationsOpen: true,
          closesAt: "2026-10-31T21:59:59.000Z",
          fundingInstrument: "Grant",
          id: fundingOpportunityId,
          maximumAmount: 200000,
          minimumAmount: 50000,
          opensAt: "2026-09-01T00:00:00.000Z",
          reference: "GROWTH-2026",
          selfCheckAvailable: true,
          slug: "growth-fund",
          status: "open",
          summary: "Support for growing Namibian businesses.",
          thematicArea: "Growth",
          title: "Growth Fund",
          totalFundingAmount: 1000000,
        }}
      />,
    );

    expect(markup).toContain("View details");
    expect(markup).toContain(">Apply</button>");
  });
});
