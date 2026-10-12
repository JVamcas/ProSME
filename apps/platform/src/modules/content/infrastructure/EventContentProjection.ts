import type { Event } from "@/payload-types";
import type { ListingItem } from "../ContentTypes";
import { media } from "./ContentProjection";

export type EventContentItem = ListingItem & {
  registrationAvailable: boolean;
  endsAt?: string | null;
  timezone: string;
  eventType: string;
  recordingUrl?: string | null;
};

export function eventContentItem(
  item: Omit<Event, "body" | "reviewStatus" | "updatedAt" | "createdAt"> &
    Partial<Pick<Event, "body">>,
): EventContentItem {
  return {
    registrationAvailable: false,
    id: item.id,
    title: item.title,
    summary: item.summary,
    slug: item.slug,
    body: item.body,
    date: item.startsAt,
    endsAt: item.endsAt,
    timezone: item.timezone ?? "Africa/Windhoek",
    eventType: item.eventType ?? "information-session",
    category: item.category ?? "General",
    recordingUrl: item.recordingUrl,
    image: media(item.image),
    location: item.location,
    href: item.registrationUrl ?? undefined,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    excludeFromSearch: item.excludeFromSearch,
  };
}
