import type { WebsiteReportFrequency } from "./WebsiteReport";

export function addReportDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function websiteReportPeriod(
  frequency: WebsiteReportFrequency,
  startDate: string,
) {
  let nextStart: string;
  if (frequency === "BIWEEKLY") {
    nextStart = addReportDays(startDate, 14);
  } else {
    if (!startDate.endsWith("-01")) {
      throw new Error("Monthly periods must start on the first of a month.");
    }
    const next = new Date(`${startDate}T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    nextStart = next.toISOString().slice(0, 10);
  }
  return { startDate, endDate: addReportDays(nextStart, -1), nextStart };
}

// Resolve a property-local calendar time without assuming a fixed UTC offset.
export function reportLocalTimeToUtc(
  date: string,
  time: string,
  timezone: string,
) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const target = Date.parse(`${date}T${time}:00Z`);
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(candidate).map((part) => [part.type, part.value]),
    );
    const represented = Date.parse(
      `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`,
    );
    const delta = target - represented;
    if (delta === 0) return new Date(candidate);
    candidate += delta;
  }
  throw new Error(
    "The selected local send time does not exist in this timezone.",
  );
}

export function websiteReportDueAt(input: {
  nextStart: string;
  sendTime: string;
  timezone: string;
  finalizationDelayHours: number;
}) {
  const periodBoundary = reportLocalTimeToUtc(
    input.nextStart,
    "00:00",
    input.timezone,
  );
  const finalizedAt = new Date(
    periodBoundary.getTime() + input.finalizationDelayHours * 3_600_000,
  );
  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: input.timezone,
  }).format(finalizedAt);
  let dueAt = reportLocalTimeToUtc(localDate, input.sendTime, input.timezone);
  if (dueAt < finalizedAt) {
    dueAt = reportLocalTimeToUtc(
      addReportDays(localDate, 1),
      input.sendTime,
      input.timezone,
    );
  }
  return dueAt;
}
