import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WebsiteUserJourneys } from "@/modules/reporting/ui/website/WebsiteUserJourneys";
import {
  parseWebsiteJourney,
  websiteJourneyLabels,
  websiteJourneyStep,
} from "@/modules/reporting/domain/WebsiteUserJourneys";
import type { AnalyticsSourceResult } from "@/modules/reporting/domain/WebsiteAnalyticsMetrics";
import type { BoundedWebsiteRows } from "@/modules/reporting/domain/WebsiteAnalyticsPanels";
import type { WebsiteUserJourney } from "@/modules/reporting/domain/WebsiteUserJourneys";

const result: AnalyticsSourceResult<BoundedWebsiteRows<WebsiteUserJourney>> = {
  state: "ready",
  data: {
    rows: [
      { steps: ["funding", "call_details", "start_application"], users: 42 },
      { steps: ["how_to_apply", "eligibility", "call_details"], users: 23 },
      { steps: ["resources", "call_details"], users: 12 },
    ],
    totalRows: 8,
    truncated: true,
  },
  fetchedAt: null,
  metadata: null,
  note: "Ranked by tracked users; sequences may overlap.",
};

describe("top observed user journeys", () => {
  it("renders the ranked arrow list from measured routes", () => {
    const markup = renderToStaticMarkup(
      <WebsiteUserJourneys result={result} />,
    );
    expect(markup).toContain("Top user journeys");
    expect(markup).toContain('<ol aria-label="Top user journeys"');
    expect(markup.match(/<li /g)).toHaveLength(3);
    expect(markup).toContain("Funding calls");
    expect(markup).toContain("Start application");
    expect(markup).toContain("Eligibility check");
    expect(markup).toContain("Resources");
    expect(markup).toContain("42 tracked users");
    expect(markup.indexOf("42 tracked users")).toBeLessThan(
      markup.indexOf("23 tracked users"),
    );
    expect(markup.indexOf("23 tracked users")).toBeLessThan(
      markup.indexOf("12 tracked users"),
    );
    expect(markup).not.toContain("<table");
    expect(markup).not.toContain("Completed");
    expect(markup).not.toContain("Rate");
  });

  it("shows no-data and unavailable states without invented ranked paths", () => {
    const empty = renderToStaticMarkup(
      <WebsiteUserJourneys
        result={{
          ...result,
          state: "no-data",
          data: { rows: [], totalRows: 0, truncated: false },
        }}
      />,
    );
    expect(empty).toContain("No user journeys recorded for this period.");
    expect(empty).not.toContain("<ol");
    const failed = renderToStaticMarkup(
      <WebsiteUserJourneys
        result={{
          ...result,
          state: "failure",
          note: "Route data unavailable.",
        }}
      />,
    );
    expect(failed).toContain("Route data unavailable.");
    expect(failed).not.toContain("<ol");
  });

  it("retains observed rows with a stale-source indicator", () => {
    const markup = renderToStaticMarkup(
      <WebsiteUserJourneys result={{ ...result, state: "stale" }} />,
    );
    expect(markup).toContain("Last saved");
    expect(markup).toContain("42 tracked users");
  });

  it("accepts only bounded approved route sequences", () => {
    expect(parseWebsiteJourney("resources>call_details")).toEqual([
      "resources",
      "call_details",
    ]);
    for (const path of [
      "funding",
      "funding>funding",
      "home>funding>eligibility>call_details",
      "resources>/portal/applications/private-id",
      "resources>__proto__",
    ]) {
      expect(parseWebsiteJourney(path)).toBeNull();
    }
    // Three step keys stay within GA's 100-character event parameter limit.
    const longest = Math.max(
      ...Object.keys(websiteJourneyLabels).map((key) => key.length),
    );
    expect(longest * 3 + 2).toBeLessThanOrEqual(100);
    expect(
      websiteJourneyStep("/portal/applications/private-id/edit"),
    ).toBeNull();
    for (const path of [
      "/cms",
      "/admin",
      "/sign-in",
      "/register",
      "/portal",
      "/portal/applications/new",
    ]) {
      expect(websiteJourneyStep(path)).toBeNull();
    }
  });
});
