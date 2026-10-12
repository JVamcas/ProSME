import { describe, expect, it } from "vitest";
import { formatLocalDateTime24, formatLocalTime24 } from "@/lib/dateUtils";

describe("shared event timezone formatting", () => {
  it("uses 24-hour time in the event timezone", () => {
    const instant = "2026-10-14T16:09:00Z";
    const result = formatLocalDateTime24(instant, "—", "Africa/Windhoek");

    expect(result).toContain("18:09");
    expect(result).not.toMatch(/\b(am|pm)\b/i);
    expect(formatLocalTime24(instant, "--:--", "Africa/Windhoek")).toBe(
      "18:09",
    );
  });

  it("keeps fallbacks for missing or invalid dates", () => {
    expect(
      formatLocalDateTime24(null, "Not scheduled", "Africa/Windhoek"),
    ).toBe("Not scheduled");
    expect(formatLocalTime24("invalid", "--:--", "Africa/Windhoek")).toBe(
      "--:--",
    );
  });
});
