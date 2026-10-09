import { access } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reporting/ServerWebsiteAnalyticsSyncService", () => ({
  processWebsiteAnalyticsSynchronization: vi.fn(),
}));
vi.mock("@/modules/reporting/ServerReportGenerationService", () => ({
  processReportGeneration: vi.fn(),
}));
vi.mock("@/modules/reporting/ServerReportScheduleService", () => ({
  processReportSchedules: vi.fn(),
}));
import { processReportSchedules } from "@/modules/reporting/ServerReportScheduleService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import { processReporting } from "@/modules/reporting/ServerReportingProcessorService";
import { processWebsiteAnalyticsSynchronization } from "@/modules/reporting/ServerWebsiteAnalyticsSyncService";
import { notificationEventKeys } from "@/modules/notifications/domain/NotificationEvent";
import { notificationEventSeeds } from "@/modules/notifications/domain/NotificationSeedConfiguration";

describe("clean slate preserves D1 and removes superseded reporting", () => {
  it.each([
    "app/(operations)/admin/reports/website/page.tsx",
    "app/(operations)/admin/reports/website/[reportId]/page.tsx",
    "app/(operations)/admin/reports/settings/page.tsx",
    "app/api/reporting/website-reports/route.ts",
    "app/api/reporting/website-schedules/route.ts",
  ])("removes the old route: %s", async (route) => {
    await expect(
      access(new URL(`../../../src/${route}`, import.meta.url)),
    ).rejects.toThrow();
  });
  it("keeps processor transport authorization and D1 synchronization counts", async () => {
    const counts = { claimed: 2, processed: 1, failed: 1, skipped: 0 };
    vi.mocked(processWebsiteAnalyticsSynchronization).mockResolvedValue(counts);
    const generation = { claimed: 0, succeeded: 0, failed: 0, preparing: 0 };
    vi.mocked(processReportGeneration).mockResolvedValue(generation);
    const schedules = { claimed: 0, queued: 0, deferred: 0 };
    vi.mocked(processReportSchedules).mockResolvedValue(schedules);
    expect(await processReporting("Bearer processor")).toEqual({
      ...counts,
      synchronization: counts,
      generation,
      schedules,
    });
    expect(processWebsiteAnalyticsSynchronization).toHaveBeenCalledWith(
      "Bearer processor",
    );
  });
  it("does not register or bootstrap the legacy notification events", () => {
    expect(
      notificationEventKeys.some((key) => key.startsWith("reporting.website.")),
    ).toBe(false);
    expect(
      notificationEventSeeds.some((event) =>
        event.key.startsWith("reporting.website."),
      ),
    ).toBe(false);
  });
});
