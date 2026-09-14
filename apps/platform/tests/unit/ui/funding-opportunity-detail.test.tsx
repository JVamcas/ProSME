import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FundingOpportunityDetailView } from "@/components/applicant/funding-opportunities/FundingOpportunityDetail";

const eligibility = {
  root: {
    children: [
      {
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text: "Applicants must be registered in Namibia.",
            type: "text",
            version: 1,
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
      },
    ],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
} as unknown as SerializedEditorState;

describe("funding opportunity detail", () => {
  it("matches the approved detail-page information hierarchy", () => {
    const markup = renderToStaticMarkup(
      <FundingOpportunityDetailView
        opportunity={{
          closesAt: "2026-10-31T21:59:59.000Z",
          eligibility,
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

    expect(markup).toContain("Back to opportunities");
    expect(markup).toContain("Growth Fund");
    expect(markup).toContain("Closes 31 Oct 2026");
    expect(markup).toContain("Overview");
    expect(markup).toContain("Eligibility");
    expect(markup).toContain("Key information");
    expect(markup).toContain("Documents");
    expect(markup).toContain("Contact");
    expect(markup).toContain("About this opportunity");
    expect(markup).toContain("Ready to apply?");
    expect(markup).toContain("Application deadline");
    expect(markup).toContain(
      'href="/portal/funding-opportunities/42/eligibility"',
    );
  });
});
