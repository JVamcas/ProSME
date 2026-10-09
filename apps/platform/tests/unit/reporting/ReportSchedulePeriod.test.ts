import { describe, expect, it } from "vitest";
import { reportScheduleInputSchema } from "@/modules/reporting/domain/ReportSchedule";
import {
  resolveReportSchedulePeriod,
  reportZonedInstant,
} from "@/modules/reporting/domain/ReportSchedulePeriod";

const schedule = {
  frequencyDays: 14,
  timezone: "Africa/Windhoek",
  sendTime: "09:00",
};

describe("anchor-based day frequency", () => {
  it("counts 14 days from the anchor before the first generation", () => {
    const first = resolveReportSchedulePeriod(schedule, "2026-10-09");
    expect(first).toEqual({
      startDate: "2026-10-09",
      endDate: "2026-10-22",
      nextCursor: "2026-10-23",
      startAt: "2026-10-08T22:00:00.000Z",
      endAt: "2026-10-22T22:00:00.000Z",
      dueAt: "2026-10-23T07:00:00.000Z",
    });
    const second = resolveReportSchedulePeriod(schedule, first.nextCursor);
    expect(second.dueAt).toBe("2026-11-06T07:00:00.000Z");
    expect(second.startDate).toBe("2026-10-23");
  });

  it.each([
    [30, "2026-01-17", "2026-02-16"],
    [30, "2026-02-16", "2026-03-18"],
    [30, "2028-02-01", "2028-03-02"],
    [14, "2026-12-25", "2027-01-08"],
    [7, "2026-10-09", "2026-10-16"],
    [1, "2026-10-09", "2026-10-10"],
  ])(
    "counts %i calendar days from %s to %s",
    (frequencyDays, anchor, nextCursor) => {
      expect(
        resolveReportSchedulePeriod({ ...schedule, frequencyDays }, anchor),
      ).toMatchObject({
        startDate: anchor,
        nextCursor,
        dueAt: `${nextCursor}T07:00:00.000Z`,
      });
    },
  );

  it("preserves local generation time across daylight-saving changes", () => {
    const zoned = {
      ...schedule,
      timezone: "America/New_York",
      frequencyDays: 7,
    };
    const first = resolveReportSchedulePeriod(zoned, "2026-03-01");
    expect(first.startAt).toBe("2026-03-01T05:00:00.000Z");
    expect(first.endAt).toBe("2026-03-08T05:00:00.000Z");
    expect(first.dueAt).toBe("2026-03-08T13:00:00.000Z");
    const second = resolveReportSchedulePeriod(zoned, first.nextCursor);
    expect(second.dueAt).toBe("2026-03-15T13:00:00.000Z");
  });

  it("resolves ambiguous times earlier and advances nonexistent times by the DST gap", () => {
    expect(reportZonedInstant("2026-11-01", "01:30", "America/New_York")).toBe(
      "2026-11-01T05:30:00.000Z",
    );
    expect(reportZonedInstant("2026-03-08", "02:30", "America/New_York")).toBe(
      "2026-03-08T07:30:00.000Z",
    );
  });

  it("accepts arbitrary anchor dates and validates integer day frequencies", () => {
    const input = { ...schedule, anchor: "2026-10-09", enabled: false };
    expect(reportScheduleInputSchema.safeParse(input).success).toBe(true);
    for (const overrides of [
      { frequencyDays: 0 },
      { frequencyDays: -1 },
      { frequencyDays: 1.5 },
      { frequencyDays: 367 },
      { timezone: "Invalid/Zone" },
      { sendTime: "25:00" },
      { anchor: "2026-02-30" },
      { cadence: "MONTHLY" },
      { finalizationHours: 48 },
    ]) {
      expect(
        reportScheduleInputSchema.safeParse({ ...input, ...overrides }).success,
      ).toBe(false);
    }
  });
});
