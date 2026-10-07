import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  configuration: vi.fn(),
  claim: vi.fn(),
  defer: vi.fn(),
  sources: vi.fn(),
  finalize: vi.fn(),
  capture: vi.fn(),
}));
vi.mock(
  "@/modules/reporting/infrastructure/GoogleAnalyticsConfiguration",
  () => ({ googleAnalyticsConfiguration: mocks.configuration }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteReportClaimRepository",
  () => ({
    claimDueWebsiteReport: mocks.claim,
    deferWebsiteReport: mocks.defer,
  }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteReportSourceRepository",
  () => ({ readCompletedWebsiteReportSources: mocks.sources }),
);
vi.mock(
  "@/modules/reporting/infrastructure/WebsiteReportFinalizeRepository",
  () => ({ finalizeWebsiteReport: mocks.finalize }),
);
vi.mock(
  "@/modules/notifications/application/ServerWebsiteReportOccurrenceService",
  () => ({ captureWebsiteReportOccurrence: mocks.capture }),
);
import { processWebsiteReports } from "@/modules/reporting/ServerWebsiteReportProcessorService";
import {
  fullBatch,
  reportingConfiguration,
} from "../../support/WebsiteAnalyticsDatabaseFixture";

const secret = "a".repeat(32);
const job = {
  id: "10000000-0000-4000-8000-000000000001",
  scheduleId: "10000000-0000-4000-8000-000000000002",
  scheduleVersion: 2,
  frequency: "MONTHLY",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  dueAt: "2026-10-03T07:00:00Z",
  leaseToken: "token",
  configuration: {
    analytics: reportingConfiguration,
    eventKey: "reporting.website.monthly",
    sendTime: "09:00",
    finalizationDelayHours: 48,
    nextStart: "2026-10-01",
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("REPORTING_PROCESSOR_SECRET", secret);
  mocks.configuration.mockReturnValue(reportingConfiguration);
  mocks.claim.mockResolvedValue(job);
  mocks.sources.mockResolvedValue({ sources: fullBatch(), eligibility: [] });
  mocks.finalize.mockResolvedValue(true);
});

describe("scheduled website report generation", () => {
  it("authenticates before configuration or persistence access", async () => {
    await expect(processWebsiteReports(null)).rejects.toThrow("Authentication");
    expect(mocks.configuration).not.toHaveBeenCalled();
    expect(mocks.claim).not.toHaveBeenCalled();
  });
  it("waits for all exact-period sources without finalizing or inventing zeros", async () => {
    mocks.sources.mockResolvedValue(null);
    expect(await processWebsiteReports(`Bearer ${secret}`)).toEqual({
      claimed: 1,
      generated: 0,
      waiting: 1,
      failed: 0,
    });
    expect(mocks.defer).toHaveBeenCalledWith(
      job,
      expect.stringContaining("Waiting"),
    );
    expect(mocks.finalize).not.toHaveBeenCalled();
  });
  it("captures the immutable snapshot and advances exactly one monthly period", async () => {
    expect((await processWebsiteReports(`Bearer ${secret}`)).generated).toBe(1);
    const input = mocks.finalize.mock.calls[0][0];
    expect(input.snapshot).toMatchObject({
      propertyId: "123",
      scope: "website-wide",
      metrics: { period: { startDate: "2026-09-01", endDate: "2026-09-30" } },
    });
    expect(input.nextDueAt.toISOString()).toBe("2026-11-03T07:00:00.000Z");
    expect(input.snapshot.summary).toContain("Visitors (GA total users): 100");
    await input.capture("transaction");
    expect(mocks.capture).toHaveBeenCalledWith(
      "transaction",
      "reporting.website.monthly",
      expect.objectContaining({ reportId: job.id, frequency: "MONTHLY" }),
    );
  });
  it("retries finalization failures without advancing the period", async () => {
    mocks.finalize.mockRejectedValue(
      new Error("recipient or database failure"),
    );
    expect((await processWebsiteReports(`Bearer ${secret}`)).failed).toBe(1);
    expect(mocks.defer).toHaveBeenCalledWith(
      job,
      expect.stringContaining("Generation failed"),
    );
  });
  it("rejects changed property configuration and recovers superseded leases", async () => {
    mocks.configuration.mockReturnValue({
      ...reportingConfiguration,
      propertyId: "456",
    });
    expect((await processWebsiteReports(`Bearer ${secret}`)).failed).toBe(1);
    expect(mocks.sources).not.toHaveBeenCalled();
    mocks.configuration.mockReturnValue(reportingConfiguration);
    mocks.finalize.mockResolvedValue(false);
    expect((await processWebsiteReports(`Bearer ${secret}`)).waiting).toBe(1);
    expect(mocks.defer).toHaveBeenCalledWith(
      job,
      expect.stringContaining("reclaimed"),
    );
  });
});
