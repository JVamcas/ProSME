import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/reporting/infrastructure/ReportingFundingCallRepository",
  () => ({
    listReportingFundingCalls: vi.fn().mockResolvedValue([]),
  }),
);
const mocks = vi.hoisted(() => ({
  configuration: vi.fn(),
  projection: vi.fn(),
  provider: vi.fn(),
}));
vi.mock(
  "@/modules/reporting/infrastructure/GoogleAnalyticsConfiguration",
  () => ({
    googleAnalyticsConfiguration: mocks.configuration,
  }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteAnalyticsSnapshotRepository",
  () => ({
    readStoredWebsiteAnalytics: mocks.projection,
  }),
);
vi.mock("@/modules/reporting/infrastructure/GoogleAnalyticsTransport", () => ({
  requestGoogleAnalytics: mocks.provider,
}));
import {
  permissionCodes,
  getPermissionDefinition,
  getPermissionGroup,
} from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

const query = { startDate: "2026-10-01", endDate: "2026-10-06" };
const actor = {
  id: "staff",
  email: "reporting@example.test",
  displayName: "Reporting staff",
  identitySubject: "reporting-staff",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  roleCodes: new Set<string>(),
  userType: "staff",
  status: "active",
  capabilities: new Set([permissionCodes.reportingWebsiteReadAll]),
} as AuthenticatedUser;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.configuration.mockReturnValue({
    propertyId: "123",
    collectionStart: "2026-10-01",
    timezone: "Africa/Windhoek",
  });
  mocks.projection.mockResolvedValue({
    current: {
      sources: {
        traffic: { state: "ready", data: { visitors: 50 } },
        applicationFunnel: { state: "stale", data: { viewedUsers: 5 } },
        topUserJourneys: {
          state: "ready",
          data: { rows: [{ steps: ["resources", "call_details"], users: 7 }] },
        },
      },
      synchronization: {
        state: "partial",
        lastAttemptAt: null,
        lastSuccessAt: null,
      },
      eligibility: [{ outcome: "likely-eligible", checks: 3 }],
    },
    previous: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function service() {
  return (await import("@/modules/reporting/application/ServerReportingService"))
    .getWebsiteAnalytics;
}

describe("reporting authorization and durable reads", () => {
  it.each([
    ["true", true],
    ["", false],
    ["false", false],
  ])(
    "reports platform-owned heatmap collection configuration (%s)",
    async (enabled, collectionEnabled) => {
      vi.stubEnv("WEBSITE_HEATMAP_ENABLED", enabled);
      const result = await (await service())(actor, query);
      expect(result.heatmap).toEqual({
        provider: "Platform",
        state: collectionEnabled ? "ready" : "unavailable",
        collectionEnabled,
        note: "Anonymous approved public-page views only. Clicks and scroll depth are stored in the platform.",
      });
    },
  );

  it("defines a distinct scoped permission and catalogue group", () => {
    expect(
      getPermissionDefinition(permissionCodes.reportingWebsiteReadAll)
        ?.description,
    ).toContain("any funding call");
    expect(
      getPermissionGroup(permissionCodes.reportingWebsiteReadAll)?.id,
    ).toBe("reporting");
  });

  it("rejects missing, inactive and CMS-only actors before stored report access", async () => {
    const read = await service();
    for (const user of [
      null,
      { ...actor, status: "suspended" },
      {
        ...actor,
        capabilities: new Set(["cms.access", "funding.application.all.read"]),
      },
    ]) {
      await expect(
        read(user as AuthenticatedUser | null, query),
      ).rejects.toThrow();
    }
    expect(mocks.configuration).not.toHaveBeenCalled();
    expect(mocks.projection).not.toHaveBeenCalled();
    expect(mocks.provider).not.toHaveBeenCalled();
  });

  it("does not allow a denied caller to read stored reports", async () => {
    const read = await service();
    await read(actor, query);
    await expect(
      read({ ...actor, capabilities: new Set() }, query),
    ).rejects.toThrow();
    expect(mocks.projection).toHaveBeenCalledTimes(1);
  });

  it("reads stored and SQL results without calling GA", async () => {
    const result = await (await service())(actor, query);
    expect(result.traffic.state).toBe("ready");
    expect(result.eligibility.data).toEqual([
      { outcome: "likely-eligible", checks: 3 },
    ]);
    expect(result.applicationFunnel).toMatchObject({
      state: "stale",
      data: { viewedUsers: 5 },
    });
    expect(mocks.provider).not.toHaveBeenCalled();
    expect(result.scopes.traffic).toBe("website-wide");
    expect(result.scopes.topUserJourneys).toBe("public-website");
    expect(result.topUserJourneys.data?.rows[0].steps).toEqual([
      "resources",
      "call_details",
    ]);
  });

  it("reports missing configuration as unavailable rather than demo/zero data", async () => {
    mocks.configuration.mockReturnValue(null);
    const result = await (await service())(actor, query);
    expect(result.traffic).toMatchObject({ state: "unavailable", data: null });
    expect(result.topUserJourneys).toMatchObject({
      state: "unavailable",
      data: null,
    });
    expect(mocks.projection).not.toHaveBeenCalled();
  });
});
