// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { FundingOpportunityCard } from "@/modules/funding-calls/ui/applicant/FundingOpportunityCard";

const fundingOpportunityId = "00000000-0000-4000-8000-000000000042";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  window.localStorage.clear();
  document.body.replaceChildren();
});

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
    expect(markup).toContain("Maximum funding");
    expect(markup).toContain("Closing date");
    expect(markup).toContain("Save for later");
    expect(markup).toContain("Funding call categories");
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
  it("keeps a saved opportunity after the card remounts", async () => {
    const opportunity = {
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
      status: "open" as const,
      summary: "Support for growing Namibian businesses.",
      thematicArea: "Growth",
      title: "Growth Fund",
      totalFundingAmount: 1000000,
    };
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<FundingOpportunityCard opportunity={opportunity} />);
    });
    const saveButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.includes("Save for later"));
    expect(saveButton?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => saveButton?.click());
    expect(container.textContent).toContain("Saved for later");
    expect(window.localStorage.getItem("sme-fund-saved-opportunities"))
      .toContain(fundingOpportunityId);

    await act(async () => root.unmount());
    const mountedAgain = createRoot(container);
    await act(async () => {
      mountedAgain.render(<FundingOpportunityCard opportunity={opportunity} />);
    });
    expect(container.textContent).toContain("Saved for later");
    await act(async () => mountedAgain.unmount());
  });
});
