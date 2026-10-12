import type {
  EventRegistrationSettings,
  PublishedRegistrationEvent,
} from "./EventRegistration";

// Opening is inclusive; closing and the event start are exclusive.
export function isEventRegistrationOpen(
  event: Pick<PublishedRegistrationEvent, "startsAt" | "published">,
  settings: Pick<EventRegistrationSettings, "enabled" | "opensAt" | "closesAt"> | null,
  now: Date,
) {
  const instant = now.getTime();
  return Boolean(
    event.published !== false &&
    settings?.enabled &&
    instant < new Date(event.startsAt).getTime() &&
    (!settings.opensAt || instant >= new Date(settings.opensAt).getTime()) &&
    (!settings.closesAt || instant < new Date(settings.closesAt).getTime()),
  );
}
