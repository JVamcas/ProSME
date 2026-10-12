import { readRecordingCategories } from "../infrastructure/EventRecordingRepository";
import "server-only";

import { cache } from "react";
import { eventContentQuerySchema } from "../api/EventContentSchemas";
import { getContentReadMode } from "./ServerContentReadService";
import {
  readEventBySlug,
  readEventContentPage,
} from "../infrastructure/PayloadEventRepository";
import {
  eventContentItem,
  type EventContentItem,
} from "../infrastructure/EventContentProjection";
import { readPublishedEvent } from "../infrastructure/PublishedContentRepository";
import { readEventRegistrationAvailability } from "../infrastructure/EventRegistrationAvailabilityRepository";
import { isEventRegistrationOpen } from "../domain/EventRegistrationPolicy";

async function withRegistrationAvailability(items: readonly EventContentItem[]) {
  // Read settings once for the bounded page, after resolving its event IDs.
  const rows = await readEventRegistrationAvailability(items.map((item) => item.id));
  const now = new Date();
  const availability = new Map(rows.map((row) => {
    const settings = {
      enabled: row.enabled === true,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
    };
    return [row.id, isEventRegistrationOpen(row, settings, now)] as const;
  }));
  return items.map((item) => ({
    ...item,
    registrationAvailable: availability.get(item.id) ?? false,
  }));
}

export const getEventBySlug = cache(async function getEventBySlug(
  slug: string,
) {
  const mode = await getContentReadMode("events");
  const item = mode.draft
    ? await readEventBySlug(slug, mode)
    : await readPublishedEvent(slug);
  if (!item) return null;
  const [event] = await withRegistrationAvailability([eventContentItem(item)]);
  return event;
});

export async function getEventContentPage(values: unknown) {
  const query = eventContentQuerySchema.parse(values);
  const mode = await getContentReadMode("events");
  const result = await readEventContentPage(query, mode);
  const projected = result.docs.map(eventContentItem);
  const items = query.period === "recordings"
    ? projected
    : await withRegistrationAvailability(projected);
  return {
    items,
    total: result.totalDocs,
    page: result.page ?? query.page,
    totalPages: result.totalPages,
  };
}

export async function getRecordingCategories() {
  return readRecordingCategories();
}
