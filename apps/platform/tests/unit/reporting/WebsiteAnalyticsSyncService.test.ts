import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  configuration: vi.fn(),
  register: vi.fn(),
  claim: vi.fn(),
  save: vi.fn(),
  synchronize: vi.fn(),
}));
vi.mock(
  "@/modules/reporting/infrastructure/GoogleAnalyticsConfiguration",
  () => ({ googleAnalyticsConfiguration: mocks.configuration }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteAnalyticsSyncRepository",
  () => ({
    registerWebsiteAnalyticsQueries: mocks.register,
    claimWebsiteAnalyticsSync: mocks.claim,
    saveWebsiteAnalyticsSync: mocks.save,
  }),
);
vi.mock("@/modules/reporting/application/WebsiteAnalyticsSourceReads", () => ({
  synchronizeWebsiteAnalyticsSources: mocks.synchronize,
}));
import { processWebsiteAnalyticsSynchronization } from "@/modules/reporting/ServerWebsiteAnalyticsSyncService";

const secret = "a".repeat(32);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("REPORTING_PROCESSOR_SECRET", secret);
  mocks.configuration.mockReturnValue({
    propertyId: "123",
    timezone: "Africa/Windhoek",
    collectionStart: "2026-01-01",
  });
  mocks.claim.mockResolvedValue({
    queryKey: "key",
    leaseToken: "token",
    startDate: "2026-10-01",
    endDate: "2026-10-06",
    includePanels: true,
  });
  mocks.save.mockResolvedValue(true);
  mocks.synchronize.mockResolvedValue({
    traffic: {
      state: "ready",
      data: { visitors: 5 },
      fetchedAt: "2026-10-06T00:00:00Z",
    },
  });
});

describe("background analytics synchronization", () => {
  it("authenticates before queuing, claiming or reading GA", async () => {
    await expect(processWebsiteAnalyticsSynchronization(null)).rejects.toThrow(
      "Authentication",
    );
    await expect(
      processWebsiteAnalyticsSynchronization(`Bearer ${"b".repeat(32)}`),
    ).rejects.toThrow();
    expect(mocks.configuration).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });

  it("queues defaults and synchronizes the exact claimed scope before saving", async () => {
    const result = await processWebsiteAnalyticsSynchronization(
      `Bearer ${secret}`,
    );
    expect(result).toEqual({ claimed: 1, processed: 1, failed: 0, skipped: 0 });
    expect(mocks.synchronize).toHaveBeenCalledWith(
      { startDate: "2026-10-01", endDate: "2026-10-06" },
      mocks.configuration(),
      true,
    );
    expect(mocks.save).toHaveBeenCalledWith(
      await mocks.claim(),
      await mocks.synchronize(),
    );
  });

  it("records partial source failures without treating them as a failed processor", async () => {
    mocks.synchronize.mockResolvedValue({
      traffic: { state: "failure", data: null, fetchedAt: null },
    });
    const result = await processWebsiteAnalyticsSynchronization(
      `Bearer ${secret}`,
    );
    expect(result).toEqual({ claimed: 1, processed: 1, failed: 1, skipped: 0 });
    expect(mocks.save).toHaveBeenCalledOnce();
  });

  it("does not publish a superseded lease and skips GA when no work is due", async () => {
    mocks.save.mockResolvedValue(false);
    expect(
      (await processWebsiteAnalyticsSynchronization(`Bearer ${secret}`))
        .skipped,
    ).toBe(1);
    mocks.claim.mockResolvedValue(null);
    mocks.synchronize.mockClear();
    expect(
      (await processWebsiteAnalyticsSynchronization(`Bearer ${secret}`))
        .claimed,
    ).toBe(0);
    expect(mocks.synchronize).not.toHaveBeenCalled();
  });
});
