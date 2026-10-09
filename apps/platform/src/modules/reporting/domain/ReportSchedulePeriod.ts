import type { ReportPeriod, ReportScheduleInput } from "./ReportSchedule";

export function addReportDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Resolve wall time using the zone's offset at that date, including DST.
// Ambiguous fall-back times use the earlier instant; nonexistent times advance
// by the DST gap. Period boundaries remain calendar dates.
export function reportZonedInstant(
  date: string,
  time: string,
  timezone: string,
) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const offsets = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const instant = wall + delta * 3600000;
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    const represented = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`,
    );
    offsets.add(represented - instant);
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .sort((a, b) => a - b);
  for (const instant of candidates) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((part) => [part.type, part.value]),
    );
    if (
      `${parts.year}-${parts.month}-${parts.day}` === date &&
      `${parts.hour}:${parts.minute}` === time
    ) {
      return new Date(instant).toISOString();
    }
  }
  return new Date(candidates[candidates.length - 1]).toISOString();
}

export function resolveReportSchedulePeriod(
  schedule: Pick<
    ReportScheduleInput,
    "frequencyDays" | "timezone" | "sendTime"
  >,
  cursor: string,
): ReportPeriod {
  const nextCursor = addReportDays(cursor, schedule.frequencyDays);
  const endAt = reportZonedInstant(nextCursor, "00:00", schedule.timezone);
  const dueAt = reportZonedInstant(
    nextCursor,
    schedule.sendTime,
    schedule.timezone,
  );
  return {
    startDate: cursor,
    endDate: addReportDays(nextCursor, -1),
    nextCursor,
    startAt: reportZonedInstant(cursor, "00:00", schedule.timezone),
    endAt,
    dueAt,
  };
}
