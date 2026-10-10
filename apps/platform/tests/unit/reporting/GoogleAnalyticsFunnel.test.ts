import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GoogleAnalyticsAdapter } from "@/modules/reporting/infrastructure/GoogleAnalyticsAdapter";
import { GoogleAnalyticsPanelsAdapter } from "@/modules/reporting/infrastructure/GoogleAnalyticsPanelsAdapter";

const configuration = {
  propertyId: "123",
  timezone: "Etc/GMT-2",
  collectionStart: "2026-10-06",
};
const input = { startDate: "2026-09-11", endDate: "2026-10-10" };

function stepRow(label: string, users: string) {
  return {
    dimensionValues: [{ value: label }],
    metricValues: [{ value: users }],
  };
}

function response(rows: ReturnType<typeof stepRow>[]) {
  return {
    funnelVisualization: {
      dimensionHeaders: [{ name: "funnelStepName" }],
      metricHeaders: [{ name: "activeUsers" }, { name: "activeUsers" }],
      rows,
      metadata: {},
    },
  };
}

describe("Google Analytics funnels with omitted zero-activity stages", () => {
  it("accepts the successful GCP response with only the first two stages", async () => {
    const transport = vi.fn().mockResolvedValue(
      response([
        stepRow("1. funding_call_view", "2"),
        stepRow("2. eligibility_check_complete", "1"),
      ]),
    );

    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).applicationFunnel(input);

    expect(result).toMatchObject({
      state: "ready",
      data: {
        viewedUsers: 2,
        completedSelfCheckUsers: 1,
        startedUsers: 0,
        submittedUsers: 0,
      },
    });
    expect(result.fetchedAt).toEqual(expect.any(String));
  });

  it("accepts a funnel containing only funding-call views", async () => {
    const transport = vi.fn().mockResolvedValue(
      response([stepRow("1. funding_call_view", "2")]),
    );

    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).applicationFunnel(input);

    expect(result).toMatchObject({
      state: "ready",
      data: {
        viewedUsers: 2,
        completedSelfCheckUsers: 0,
        startedUsers: 0,
        submittedUsers: 0,
      },
    });
  });

  it("preserves no-data for an entirely empty funnel with valid headers", async () => {
    const transport = vi.fn().mockResolvedValue(response([]));

    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).applicationFunnel(input);

    expect(result).toMatchObject({
      state: "no-data",
      data: {
        viewedUsers: 0,
        completedSelfCheckUsers: 0,
        startedUsers: 0,
        submittedUsers: 0,
      },
    });
  });

  it("shows zero completion when starters exist but submissions are omitted", async () => {
    const transport = vi.fn().mockResolvedValue(
      response([stepRow("1. application_start", "2")]),
    );

    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).completion(input);

    expect(result).toMatchObject({
      state: "ready",
      data: { startedUsers: 2, submittedUsers: 0, rate: 0 },
    });
  });

  it("keeps completion unavailable when both stages are omitted", async () => {
    const transport = vi.fn().mockResolvedValue(response([]));

    const result = await new GoogleAnalyticsAdapter(
      configuration,
      transport,
    ).completion(input);

    expect(result).toMatchObject({
      state: "unavailable",
      data: { startedUsers: 0, submittedUsers: 0, rate: null },
    });
  });

  it("handles omitted completions in the shared self-check funnel", async () => {
    const transport = vi.fn().mockResolvedValue(
      response([stepRow("1. funding_call_view", "2")]),
    );

    const result = await new GoogleAnalyticsPanelsAdapter(
      configuration,
      transport,
    ).selfCheckJourney(input);

    expect(result).toMatchObject({
      state: "ready",
      data: { viewedUsers: 2, completedSelfCheckUsers: 0 },
    });
  });

  it.each([
    {
      name: "duplicate stages",
      rows: [
        stepRow("1. funding_call_view", "2"),
        stepRow("1. funding_call_view", "2"),
      ],
    },
    {
      name: "unexpected stages",
      rows: [stepRow("1. unknown_event", "2")],
    },
    {
      name: "incorrect stage numbers",
      rows: [stepRow("2. funding_call_view", "2")],
    },
    {
      name: "missing stage dimensions",
      rows: [{ dimensionValues: [], metricValues: [{ value: "2" }] }],
    },
    {
      name: "missing metrics",
      rows: [
        {
          dimensionValues: [{ value: "1. funding_call_view" }],
          metricValues: [],
        },
      ],
    },
    {
      name: "negative counts",
      rows: [stepRow("1. funding_call_view", "-1")],
    },
    {
      name: "fractional counts",
      rows: [stepRow("1. funding_call_view", "1.5")],
    },
    {
      name: "blank metrics",
      rows: [stepRow("1. funding_call_view", "")],
    },
    {
      name: "positive activity after an omitted preceding stage",
      rows: [
        stepRow("1. funding_call_view", "2"),
        stepRow("3. application_start", "1"),
      ],
    },
  ])("still rejects $name", async ({ rows }) => {
    const transport = vi.fn().mockResolvedValue(response(rows));

    await expect(
      new GoogleAnalyticsAdapter(configuration, transport).applicationFunnel(input),
    ).rejects.toThrow();
  });
});
