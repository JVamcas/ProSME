import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HomeFundingCall } from "@/modules/funding-calls/ui/public/HomeFundingCall";
import type { PublicFundingCallSummary } from "@/modules/funding-calls/api/PublicFundingCallTransport";

const call: PublicFundingCallSummary = {
  applicationsOpen: true,
  closesAt: "2026-09-29T08:09:00.000Z",
  fundingInstrument: "Growth grant",
  id: "00000000-0000-4000-8000-000000000042",
  maximumAmount: 100000,
  minimumAmount: 50000,
  opensAt: "2026-09-01T08:00:00.000Z",
  reference: "SMEF-2026-01",
  selfCheckAvailable: true,
  slug: "msme-growth-grant",
  status: "open",
  summary: "Support businesses to grow.",
  summaryHtml: "<p>Support <strong>businesses</strong> to grow.</p>",
  thematicArea: null,
  title: "MSME Growth Grant",
  totalFundingAmount: 1000000,
};

describe("homepage funding call", () => {
  it("shows formatted published text in a three-line preview and links to the call", () => {
    const markup = renderToStaticMarkup(<HomeFundingCall call={call} />);

    expect(markup).toContain("<strong>businesses</strong>");
    expect(markup).toContain("line-clamp-3");
    expect(markup).toContain('href="/funding/msme-growth-grant"');
    expect(markup).toContain("Application deadline");
    expect(markup).toContain("Growth grant");
  });
});
