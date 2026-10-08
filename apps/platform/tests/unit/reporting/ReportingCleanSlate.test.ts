import { access } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/reporting/ServerWebsiteAnalyticsSyncService", () => ({
  processWebsiteAnalyticsSynchronization: vi.fn(),
}));
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
    await expect(access(new URL(`../../../src/${route}`, import.meta.url))).rejects.toThrow();
  });
  it("keeps processor transport authorization and D1 synchronization counts", async () => {
    const counts = { claimed: 2, processed: 1, failed: 1, skipped: 0 };
    vi.mocked(processWebsiteAnalyticsSynchronization).mockResolvedValue(counts);
    expect(await processReporting("Bearer processor")).toEqual({
      ...counts,
      synchronization: counts,
    });
    expect(processWebsiteAnalyticsSynchronization).toHaveBeenCalledWith("Bearer processor");
  });
  it("does not register or bootstrap the legacy notification events", () => {
    expect(notificationEventKeys.some((key) => key.startsWith("reporting.website."))).toBe(false);
    expect(notificationEventSeeds.some((event) => event.key.startsWith("reporting.website."))).toBe(
      false,
    );
  });
});
