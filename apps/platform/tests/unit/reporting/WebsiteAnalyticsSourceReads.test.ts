import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  traffic: vi.fn(),
  reach: vi.fn(),
  completion: vi.fn(),
  panel: vi.fn(),
}));
vi.mock("@/modules/reporting/infrastructure/GoogleAnalyticsAdapter", () => ({
  GoogleAnalyticsAdapter: class {
    traffic = mocks.traffic;
    reach = mocks.reach;
    completion = mocks.completion;
    applicationFunnel = mocks.panel;
  },
}));
vi.mock(
  "@/modules/reporting/infrastructure/GoogleAnalyticsPanelsAdapter",
  () => ({
    GoogleAnalyticsPanelsAdapter: class {
      dailyTraffic = mocks.panel;
      pages = mocks.panel;
      regions = mocks.panel;
      calls = mocks.panel;
      selfCheckJourney = mocks.panel;
    },
  }),
);
import { synchronizeWebsiteAnalyticsSources } from "@/modules/reporting/application/WebsiteAnalyticsSourceReads";

describe("independent background provider reads", () => {
  it("sanitizes a failed source while keeping completed sources", async () => {
    mocks.traffic.mockRejectedValue(new Error("credential material"));
    const successful = {
      state: "ready",
      data: { startedUsers: 5 },
      fetchedAt: "2026-10-06",
      metadata: null,
      note: null,
    };
    mocks.reach.mockResolvedValue(successful);
    mocks.completion.mockResolvedValue(successful);
    const result = await synchronizeWebsiteAnalyticsSources(
      { startDate: "2026-10-01", endDate: "2026-10-06" },
      {
        propertyId: "123",
        timezone: "Africa/Windhoek",
        collectionStart: "2026-01-01",
      },
      false,
    );
    expect(result.traffic).toMatchObject({ state: "failure", data: null });
    expect(result.applicationReach).toEqual(successful);
    expect(Object.keys(result)).toHaveLength(3);
    expect(mocks.panel).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("credential material");
  });
});
