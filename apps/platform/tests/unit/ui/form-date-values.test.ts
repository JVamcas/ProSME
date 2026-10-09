import { describe, expect, it } from "vitest";

import {
  disabledFormDateTimes,
  formatFormDate,
  isFormDateInRange,
  parseFormDate,
} from "@/shared/utils/formDateValues";

describe("form date value conversion", () => {
  it("retains calendar dates and local date-times without timezone conversion", () => {
    expect(formatFormDate(parseFormDate("2026-09-15"), false)).toBe("2026-09-15");
    expect(formatFormDate(parseFormDate("2026-09-15T14:30", true), true))
      .toBe("2026-09-15T14:30:00");
    expect(formatFormDate(parseFormDate("2026-09-15T14:30:12.123", true), true))
      .toBe("2026-09-15T14:30:12.123");
    expect(formatFormDate(parseFormDate("2026-09-15T14:30:12.5", true), true))
      .toBe("2026-09-15T14:30:12.500");
    expect(formatFormDate(null, true)).toBe("");
  });

  it.each(["", "invalid", "2026-02-30", "2026-13-15", "2026-09-15T14:30Z"])(
    "rejects invalid date values: %s",
    (value) => expect(parseFormDate(value)).toBeNull(),
  );

  it.each(["2026-02-30T14:30", "2026-09-15T24:30", "2026-09-15T14:60", "2026-09-15T14:30Z"])(
    "rejects invalid local date-times: %s",
    (value) => expect(parseFormDate(value, true)).toBeNull(),
  );

  it("includes boundary values and rejects times outside them", () => {
    const min = parseFormDate("2026-09-15T14:15", true)!;
    const max = parseFormDate("2026-09-15T16:45", true)!;
    expect(isFormDateInRange(min, min, max)).toBe(true);
    expect(isFormDateInRange(max, min, max)).toBe(true);
    expect(isFormDateInRange(min.subtract(1, "minute"), min, max)).toBe(false);
    expect(isFormDateInRange(max.add(1, "minute"), min, max)).toBe(false);

    const restrictions = disabledFormDateTimes(min, min, max);
    expect(restrictions.disabledMinutes(16)).toContain(46);
    expect(restrictions.disabledMinutes(16)).not.toContain(45);
    expect(disabledFormDateTimes(min.add(1, "day"), min, max).disabledHours())
      .toHaveLength(24);
  });
});
