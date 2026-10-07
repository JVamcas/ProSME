import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteAnalyticsPanel } from "@/modules/reporting/ui/website/WebsiteAnalyticsPanel";
import { WebsiteMostViewedPages } from "@/modules/reporting/ui/website/WebsiteMostViewedPages";
import {
  fundingCallEngagementRows,
  WebsiteFundingCallEngagement,
} from "@/modules/reporting/ui/website/WebsiteFundingCallEngagement";

const calls = [
  { id: "call-a", title: "First call" },
  { id: "call-b", title: "Second call" },
];

describe("compact analytics tables", () => {
  it("shows one named call per row, ranks by views and counts submissions separately", () => {
    const rows = fundingCallEngagementRows(
      {
        totalRows: 4,
        truncated: false,
        rows: [
          {
            fundingCallId: "call-a",
            event: "application_start",
            users: 3,
            events: 7,
          },
          {
            fundingCallId: "call-a",
            event: "funding_call_view",
            users: 3,
            events: 10,
          },
          {
            fundingCallId: "call-a",
            event: "application_submit",
            users: 2,
            events: 2,
          },
          {
            fundingCallId: "call-b",
            event: "funding_call_view",
            users: 4,
            events: 15,
          },
        ],
      },
      calls,
    );
    expect(rows).toEqual([
      { id: "call-b", title: "Second call", views: 15, applications: 0 },
      { id: "call-a", title: "First call", views: 10, applications: 2 },
    ]);
  });

  it("does not label legacy user counts as views or missing truncated counts as zero", () => {
    for (const truncated of [true, false]) {
      const rows = fundingCallEngagementRows(
        {
          totalRows: truncated ? 101 : 1,
          truncated,
          rows: [{
            fundingCallId: "call-a",
            event: "funding_call_view",
            users: 9,
          }],
        },
        calls,
      );
      expect(rows[0]).toMatchObject({ views: null, applications: null });
    }
  });

  it.each([
    { rows: [] },
    { rows: [{ path: "/funding-calls", pageViews: 8 }] },
  ])(
    "keeps the same scroll viewport for empty and populated page tables",
    ({ rows }) => {
      const markup = renderToStaticMarkup(
        <WebsiteMostViewedPages
          data={{ rows, totalRows: rows.length, truncated: false }}
        />,
      );
      expect(markup).toContain("height:240px");
      expect(markup).toContain("overflow-auto");
      expect(markup).toContain("sticky top-0");
    },
  );

  it.each(["ready", "no-data", "failure"] as const)(
    "keeps engagement card height stable in the %s state",
    (state) => {
      const data = { rows: [], totalRows: 0, truncated: false };
      const markup = renderToStaticMarkup(
        <WebsiteAnalyticsPanel
          title="Funding call engagement"
          scope="Recorded views and submissions"
          contentHeight={244}
          result={{
            state,
            data: state === "failure" ? null : data,
            metadata: null,
            fetchedAt: null,
            note: null,
          }}
        >
          {(value) => <WebsiteFundingCallEngagement calls={calls} data={value} />}
        </WebsiteAnalyticsPanel>,
      );
      expect(markup).toContain("height:244px");
      expect(markup).toContain("h-[72px]");
      expect(markup.includes("<table")).toBe(state !== "failure");
    },
  );
});
