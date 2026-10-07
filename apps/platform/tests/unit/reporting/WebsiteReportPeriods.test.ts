import { describe, expect, it } from "vitest";
import {
  reportLocalTimeToUtc,
  websiteReportDueAt,
  websiteReportPeriod,
} from "@/modules/reporting/domain/WebsiteReportPeriods";
import { websiteScheduleUpdateSchema } from "@/modules/reporting/api/WebsiteReportSchemas";

describe("website reporting periods and property-local delivery", () => {
  it("keeps anchored 14-day periods consecutive across years", () => {
    expect(websiteReportPeriod("BIWEEKLY", "2026-12-25")).toEqual({
      startDate: "2026-12-25",
      endDate: "2027-01-07",
      nextStart: "2027-01-08",
    });
  });
  it.each([
    ["2024-02-01", "2024-02-29", "2024-03-01"],
    ["2026-02-01", "2026-02-28", "2026-03-01"],
    ["2026-12-01", "2026-12-31", "2027-01-01"],
  ])("covers the whole calendar month starting %s", (start, end, next) => {
    expect(websiteReportPeriod("MONTHLY", start)).toEqual({
      startDate: start,
      endDate: end,
      nextStart: next,
    });
  });
  it("rejects monthly anchors in the middle of a month", () => {
    expect(() => websiteReportPeriod("MONTHLY", "2026-10-07")).toThrow("first");
  });
  it("waits for finalization, then uses the next agreed local send time", () => {
    expect(
      websiteReportDueAt({
        nextStart: "2026-10-01",
        sendTime: "09:00",
        timezone: "Africa/Windhoek",
        finalizationDelayHours: 48,
      }).toISOString(),
    ).toBe("2026-10-03T07:00:00.000Z");
    expect(
      websiteReportDueAt({
        nextStart: "2026-10-01",
        sendTime: "09:00",
        timezone: "Africa/Windhoek",
        finalizationDelayHours: 60,
      }).toISOString(),
    ).toBe("2026-10-04T07:00:00.000Z");
  });
  it("resolves daylight-saving offsets and rejects nonexistent local times", () => {
    expect(
      reportLocalTimeToUtc(
        "2026-03-29",
        "09:00",
        "Europe/London",
      ).toISOString(),
    ).toBe("2026-03-29T08:00:00.000Z");
    expect(() =>
      reportLocalTimeToUtc("2026-03-29", "01:30", "Europe/London"),
    ).toThrow("does not exist");
  });
  it("bounds schedule settings and rejects additional recipient lists", () => {
    const settings = {
      expectedVersion: 1,
      enabled: true,
      anchorDate: "2026-10-01",
      sendTime: "09:00",
      finalizationDelayHours: 48,
    };
    expect(websiteScheduleUpdateSchema.safeParse(settings).success).toBe(true);
    for (const extra of [
      { sendTime: "25:00" },
      { finalizationDelayHours: 0 },
      { recipients: ["someone@example.test"] },
    ]) {
      expect(
        websiteScheduleUpdateSchema.safeParse({ ...settings, ...extra })
          .success,
      ).toBe(false);
    }
  });
});
