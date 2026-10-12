import { CalendarDays, MapPin, UsersRound } from "lucide-react";

import { formatEventSchedule } from "../../EventSchedulePresentation";
import type { EventContentItem } from "../../infrastructure/EventContentProjection";

export function EventScheduleDetails({ item }: { item: EventContentItem }) {
  return (
    <dl className="mt-5 grid gap-3 text-sm text-brand-navy/75">
      <div className="flex items-center gap-3">
        <CalendarDays className="size-5 text-brand-navy" aria-hidden="true" />
        <dt className="sr-only">Date and time</dt>
        <dd>{formatEventSchedule(item)}</dd>
      </div>
      <div className="flex items-center gap-3">
        <MapPin className="size-5 text-brand-navy" aria-hidden="true" />
        <dt className="sr-only">Venue</dt>
        <dd>{item.location || "Venue to be confirmed"}</dd>
      </div>
      <div className="flex items-center gap-3">
        <UsersRound className="size-5 text-brand-navy" aria-hidden="true" />
        <dt className="sr-only">Event type</dt>
        <dd>{item.eventType.replaceAll("-", " ")}</dd>
      </div>
    </dl>
  );
}
