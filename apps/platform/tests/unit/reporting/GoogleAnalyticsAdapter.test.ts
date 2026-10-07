import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GoogleAnalyticsAdapter } from "@/modules/reporting/infrastructure/GoogleAnalyticsAdapter";
import { orderedFunnelQuery } from "@/modules/reporting/infrastructure/GoogleAnalyticsQueries";
import { websiteAnalyticsQuerySchema } from "@/modules/reporting/api/WebsiteAnalyticsSchemas";

const configuration = {
  propertyId: "123",
  timezone: "Africa/Windhoek",
  collectionStart: "2026-10-01",
};
const input = {
  startDate: "2026-10-01",
  endDate: "2026-10-06",
  fundingCallId: "00000000-0000-4000-8000-000000000042",
};

function funnel(events: string[], counts: number[]) {
  return {
    funnelVisualization: {
      dimensionHeaders: [{ name: "funnelStepName" }],
      metricHeaders: [{ name: "activeUsers" }],
      rows: events.map((event, index) => ({
        dimensionValues: [{ value: `${index + 1}. ${event}` }],
        metricValues: [{ value: String(counts[index]) }],
      })),
      metadata: {
        samplingMetadatas: [
          { samplesReadCount: "10", samplingSpaceSize: "100" },
        ],
      },
    },
  };
}

describe("D1 metric contracts and ordered funnels", () => {
  it("bounds and validates date/call scopes", () => {
    expect(
      websiteAnalyticsQuerySchema.safeParse({
        ...input,
        startDate: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      websiteAnalyticsQuerySchema.safeParse({ ...input, endDate: "2027-10-02" })
        .success,
    ).toBe(false);
    expect(
      websiteAnalyticsQuerySchema.safeParse({ ...input, endDate: "2026-09-30" })
        .success,
    ).toBe(false);
    expect(
      websiteAnalyticsQuerySchema.safeParse({
        ...input,
        fundingCallId: "private-id",
      }).success,
    ).toBe(false);
  });

  it("uses totalUsers for visitors and preserves threshold/source metadata", async () => {
    const transport = vi.fn().mockResolvedValue({
      metricHeaders: [
        { name: "totalUsers" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
      ],
      rows: [
        { metricValues: [{ value: "20" }, { value: "60" }, { value: "42.5" }] },
      ],
      metadata: {
        timeZone: configuration.timezone,
        subjectToThresholding: true,
        dataLossFromOtherRow: true,
      },
    });
    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).traffic(input);
    expect(result.data).toEqual({
      visitors: 20,
      pageViews: 60,
      averageSessionDurationSeconds: 42.5,
    });
    expect(result.metadata).toMatchObject({
      subjectToThresholding: true,
      dataLossFromOtherRow: true,
    });
    expect(transport.mock.calls[0][2]).not.toHaveProperty("dimensionFilter");
  });

  it("binds the exact same call to every event step, excluding cross-call events", () => {
    const request = orderedFunnelQuery(input, true);
    expect(request.funnel.isOpenFunnel).toBe(false);
    for (const step of request.funnel.steps) {
      const filter = step.filterExpression.funnelEventFilter;
      expect(
        filter.funnelParameterFilterExpression?.funnelParameterFilter,
      ).toMatchObject({
        eventParameterName: "funding_call_id",
        stringFilter: { matchType: "EXACT", value: input.fundingCallId },
      });
      const otherCall = {
        event: filter.eventName,
        funding_call_id: "00000000-0000-4000-8000-000000000099",
      };
      expect(otherCall.funding_call_id).not.toBe(
        filter.funnelParameterFilterExpression?.funnelParameterFilter
          .stringFilter.value,
      );
    }
    expect(request.funnel.steps.map((step) => step.name)).toEqual([
      "funding_call_view",
      "eligibility_check_complete",
      "application_start",
      "application_submit",
    ]);
  });

  it("handles Google's headerless empty traffic response as no data", async () => {
    const transport = vi.fn().mockResolvedValue({
      metadata: { currencyCode: "USD", timeZone: configuration.timezone },
      propertyQuota: { tokensPerDay: { consumed: 1, remaining: 199993 } },
      kind: "analyticsData#runReport",
    });
    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).traffic(input);
    expect(result).toMatchObject({
      state: "no-data",
      data: { visitors: 0, pageViews: 0, averageSessionDurationSeconds: 0 },
      metadata: { timezone: configuration.timezone },
    });
  });

  it.each([
    {},
    { metadata: { timeZone: configuration.timezone } },
    {
      kind: "analyticsData#runReport",
      metadata: { timeZone: configuration.timezone },
      rows: [{ metricValues: [{ value: "12" }] }],
    },
    {
      kind: "analyticsData#runReport",
      metadata: { timeZone: configuration.timezone },
      rowCount: 1,
    },
  ])(
    "rejects malformed or nonempty traffic without metric headers",
    async (report) => {
      const transport = vi.fn().mockResolvedValue(report);
      await expect(
        new GoogleAnalyticsAdapter(configuration, transport).traffic(input),
      ).rejects.toThrow("Missing analytics metric headers");
    },
  );

  it("still rejects an empty report from a different property timezone", async () => {
    const transport = vi.fn().mockResolvedValue({
      metadata: { timeZone: "America/Los_Angeles" },
      kind: "analyticsData#runReport",
    });
    await expect(
      new GoogleAnalyticsAdapter(configuration, transport).traffic(input),
    ).rejects.toThrow(
      "Analytics property timezone does not match configuration",
    );
  });

  it("uses an independent ordered starter denominator and records sampling", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        funnel(["application_start", "application_submit"], [10, 4]),
      );
    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).completion(input);
    expect(result.data).toEqual({
      startedUsers: 10,
      submittedUsers: 4,
      rate: 0.4,
    });
    expect(result.metadata?.sampled).toBe(true);
    expect(transport.mock.calls[0][1]).toBe("runFunnelReport");
  });

  it("reads the four ordered stages and preserves the eligibility completion count", async () => {
    const events = [
      "funding_call_view",
      "eligibility_check_complete",
      "application_start",
      "application_submit",
    ];
    const transport = vi
      .fn()
      .mockResolvedValue(funnel(events, [100, 75, 50, 20]));
    const adapter = new GoogleAnalyticsAdapter(configuration, transport);
    expect((await adapter.applicationFunnel(input)).data).toEqual({
      viewedUsers: 100,
      completedSelfCheckUsers: 75,
      startedUsers: 50,
      submittedUsers: 20,
    });
    expect(
      transport.mock.calls[0][2].funnel.steps.map(
        (step: { name: string }) => step.name,
      ),
    ).toEqual(events);
    transport.mockResolvedValue(funnel(events, [100, 20, 50, 10]));
    await expect(adapter.applicationFunnel(input)).rejects.toThrow(
      "Invalid call funnel counts",
    );
  });

  it("marks a missing denominator unavailable and rejects malformed counts", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(
        funnel(["application_start", "application_submit"], [0, 0]),
      );
    const adapter = new GoogleAnalyticsAdapter(configuration, transport);
    expect(await adapter.completion(input)).toMatchObject({
      state: "unavailable",
      data: { rate: null },
    });
    transport.mockResolvedValue(
      funnel(["application_start", "application_submit"], [2, 3]),
    );
    await expect(adapter.completion(input)).rejects.toThrow(
      "Invalid ordered funnel counts",
    );
    transport.mockResolvedValue({
      funnelVisualization: { metricHeaders: [], rows: [] },
    });
    await expect(adapter.completion(input)).rejects.toThrow();
  });
});
