import { describe, expect, it } from "vitest";
import { previousWebsiteAnalyticsPeriod } from "@/modules/reporting/domain/WebsiteAnalyticsComparison";

describe("equal-length comparison periods", () => {
  it("crosses month/leap-year boundaries and preserves the call scope", () => {
    expect(
      previousWebsiteAnalyticsPeriod({
        startDate: "2024-03-01",
        endDate: "2024-03-02",
        fundingCallId: "call",
      }),
    ).toEqual({
      startDate: "2024-02-28",
      endDate: "2024-02-29",
      fundingCallId: "call",
    });
  });
  it("uses the previous calendar day for a one-day report", () => {
    expect(
      previousWebsiteAnalyticsPeriod({
        startDate: "2026-01-01",
        endDate: "2026-01-01",
      }),
    ).toEqual({ startDate: "2025-12-31", endDate: "2025-12-31" });
  });
});
