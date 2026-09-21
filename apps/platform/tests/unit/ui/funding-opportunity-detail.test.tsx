import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FundingOpportunityDetailView } from "@/components/applicant/funding-opportunities/FundingOpportunityDetail";

describe("funding opportunity detail", () => {
  it("matches the approved detail-page information hierarchy", () => {
    const markup = renderToStaticMarkup(
      <FundingOpportunityDetailView
        opportunity={{
          applicationsOpen: true,
          closesAt: "2026-10-31T21:59:59.000Z",
          description:
            "<p>Support for <strong>growing</strong> Namibian businesses.</p>",
          eligibilitySummary: null,
          fundingInstrument: "Grant",
          id: "00000000-0000-4000-8000-000000000042",
          maximumAmount: 200000,
          minimumAmount: 50000,
          opensAt: "2026-09-01T00:00:00.000Z",
          publicContact: { email: null, name: null, phone: null },
          publicDocuments: [],
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

    expect(markup).toContain("Back to opportunities");
    expect(markup).toContain("Growth Fund");
    expect(markup).toContain("Closes 31 Oct 2026");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Key information");
    expect(markup).toContain("Documents");
    expect(markup).toContain("Contact");
    expect(markup).toContain("About this opportunity");
    expect(markup).toContain("<strong>growing</strong>");
    expect(markup).toContain("Ready to apply?");
    expect(markup).toContain("Application deadline");
    expect(markup).toContain(
      'href="/portal/funding-opportunities/00000000-0000-4000-8000-000000000042/eligibility"',
    );
  });
});
