import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GoogleAnalyticsPanelsAdapter } from "@/modules/reporting/infrastructure/GoogleAnalyticsPanelsAdapter";

const configuration = {
  propertyId: "123",
  timezone: "Africa/Windhoek",
  collectionStart: "2026-10-01",
};
const input = { startDate: "2026-10-01", endDate: "2026-10-06" };

describe("website panel projections", () => {
  it("keeps call views and submissions as event counts, distinct from users", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    const transport = vi.fn().mockResolvedValue({
      dimensionHeaders: [
        { name: "customEvent:funding_call_id" },
        { name: "eventName" },
      ],
      metricHeaders: [{ name: "totalUsers" }, { name: "eventCount" }],
      rows: [
        {
          dimensionValues: [{ value: id }, { value: "funding_call_view" }],
          metricValues: [{ value: "3" }, { value: "8" }],
        },
      ],
    });
    const result = await new GoogleAnalyticsPanelsAdapter(
      configuration,
      transport,
    ).calls({ ...input, fundingCallId: id });
    expect(result.data?.rows).toEqual([
      {
        fundingCallId: id,
        event: "funding_call_view",
        users: 3,
        events: 8,
      },
    ]);
    expect(transport.mock.calls[0][2]).toMatchObject({
      metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
      dimensionFilter: {
        andGroup: {
          expressions: [
            { filter: { fieldName: "eventName" } },
            {
              filter: {
                fieldName: "customEvent:funding_call_id",
                stringFilter: { value: id },
              },
            },
          ],
        },
      },
    });
  });

  it("retains unknown/unmapped regions and explains its denominator", async () => {
    const transport = vi.fn().mockResolvedValue({
      dimensionHeaders: [{ name: "region" }],
      metricHeaders: [{ name: "totalUsers" }],
      rows: ["Khomas", "(not set)", "Unverified alias"].map((value, index) => ({
        dimensionValues: [{ value }],
        metricValues: [{ value: String([10, 5, 5][index]) }],
      })),
    });
    const result = await new GoogleAnalyticsPanelsAdapter(
      configuration,
      transport,
    ).regions(input);
    expect(result.data?.regionalUserSum).toBe(20);
    expect(result.data?.regions).toEqual([
      {
        providerRegion: "Khomas",
        canonicalRegion: "Khomas",
        users: 10,
        share: 0.5,
      },
      {
        providerRegion: "(not set)",
        canonicalRegion: null,
        users: 5,
        share: 0.25,
      },
      {
        providerRegion: "Unverified alias",
        canonicalRegion: null,
        users: 5,
        share: 0.25,
      },
    ]);
    expect(transport.mock.calls[0][2]).toMatchObject({
      dimensionFilter: {
        filter: { fieldName: "country", stringFilter: { value: "Namibia" } },
      },
    });
  });

  it("keeps private historical paths out of page results and labels truncation", async () => {
    const transport = vi.fn().mockResolvedValue({
      dimensionHeaders: [{ name: "pagePath" }],
      metricHeaders: [{ name: "screenPageViews" }],
      rowCount: 12,
      rows: [
        {
          dimensionValues: [{ value: "/portal/applications/private-id/edit" }],
          metricValues: [{ value: "10" }],
        },
      ],
    });
    const result = await new GoogleAnalyticsPanelsAdapter(
      configuration,
      transport,
    ).pages(input);
    expect(result.data).toMatchObject({
      truncated: true,
      totalRows: 12,
      rows: [{ path: "/portal/applications/:id/edit", pageViews: 10 }],
    });
    expect(JSON.stringify(result)).not.toContain("private-id");
  });
});
