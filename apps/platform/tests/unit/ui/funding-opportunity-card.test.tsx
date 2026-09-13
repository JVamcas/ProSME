import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FundingOpportunityCard } from "@/components/applicant/funding-opportunities/FundingOpportunityCard";

describe("funding opportunity card", () => {
  it("renders the CMS projection and internal detail link", () => {
    const markup = renderToStaticMarkup(
      <FundingOpportunityCard
        opportunity={{
          closesAt: "2026-10-31T21:59:59.000Z",
          id: 42,
          maximumAmount: 200000,
          minimumAmount: 50000,
          opensAt: "2026-09-01T00:00:00.000Z",
          slug: "growth-fund",
          status: "open",
          summary: "Support for growing Namibian businesses.",
          title: "Growth Fund",
        }}
      />,
    );

    expect(markup).toContain("Growth Fund");
    expect(markup).toContain("Support for growing Namibian businesses.");
    expect(markup).toContain("N$200,000");
    expect(markup).toContain(
      'aria-label="Important date: Closes 31 Oct 2026"',
    );
    expect(markup).toContain(
      'href="/portal/funding-opportunities/42"',
    );
    expect(markup).toContain("Open");
  });
});
