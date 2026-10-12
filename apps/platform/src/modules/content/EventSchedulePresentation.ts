import { formatLocalDateTime24, formatLocalTime24 } from "@/lib/dateUtils";
import { eventLocalSchedule } from "./domain/EventSchedule";
import type { EventContentItem } from "./infrastructure/EventContentProjection";

export function formatEventSchedule(
  item: Pick<EventContentItem, "date" | "endsAt" | "timezone">,
) {
  if (!item.date) return "Date to be confirmed";

  const start = formatLocalDateTime24(
    item.date,
    "Date to be confirmed",
    item.timezone,
  );
  if (!item.endsAt) return `${start} (${item.timezone})`;

  const startDate = eventLocalSchedule(item.date, item.timezone).date;
  const endDate = eventLocalSchedule(item.endsAt, item.timezone).date;
  const end =
    startDate === endDate
      ? formatLocalTime24(item.endsAt, "--:--", item.timezone)
      : formatLocalDateTime24(item.endsAt, "—", item.timezone);

  return `${start}–${end} (${item.timezone})`;
}
