import "server-only";

import { getPayload, type Where } from "payload";
import configPromise from "@payload-config";
import { media } from "./ContentProjection";
import type { EventOperationsListItem } from "../api/EventOperationsTypes";
import type { EventContentQuery } from "../api/EventContentSchemas";

const eventSelection = {
  title: true,
  slug: true,
  summary: true,
  image: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  location: true,
  eventType: true,
  category: true,
  recordingUrl: true,
  registrationUrl: true,
  seoTitle: true,
  seoDescription: true,
  excludeFromSearch: true,
} as const;

const mediaPopulation = {
  media: {
    alt: true,
    url: true,
    width: true,
    height: true,
    sizes: true,
    mimeType: true,
    filename: true,
  },
} as const;

type EventReadMode = { draft: boolean; where: Where };

export async function readEventBySlug(slug: string, mode: EventReadMode) {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "events",
    depth: 1,
    draft: mode.draft,
    overrideAccess: true,
    where: { and: [{ slug: { equals: slug } }, mode.where] },
    select: { ...eventSelection, body: true },
    populate: mediaPopulation,
    limit: 1,
    pagination: false,
  });
  return result.docs[0] ?? null;
}

export async function readEventContentPage(
  query: EventContentQuery,
  mode: EventReadMode,
  now = new Date(),
) {
  const payload = await getPayload({ config: configPromise });
  const filters: Where[] = [mode.where];
  if (query.search) {
    filters.push({
      or: [
        { title: { contains: query.search } },
        { summary: { contains: query.search } },
        { location: { contains: query.search } },
      ],
    });
  }
  if (query.eventType) filters.push({ eventType: { equals: query.eventType } });
  if (query.category) filters.push({ category: { equals: query.category } });
  if (query.period === "upcoming") {
    filters.push({
      or: [
        { startsAt: { greater_than: now.toISOString() } },
        { endsAt: { greater_than: now.toISOString() } },
      ],
    });
  }
  if (query.period === "recordings") {
    filters.push({
      and: [
        { startsAt: { less_than_equal: now.toISOString() } },
        {
          or: [
            { endsAt: { less_than_equal: now.toISOString() } },
            { endsAt: { exists: false } },
          ],
        },
        { recordingUrl: { exists: true } },
        { recordingUrl: { not_equals: "" } },
      ],
    });
  }
  return payload.find({
    collection: "events",
    depth: 1,
    draft: mode.draft,
    overrideAccess: true,
    where: { and: filters },
    select: eventSelection,
    populate: mediaPopulation,
    sort:
      query.period === "recordings" ? ["-startsAt", "-id"] : ["startsAt", "id"],
    limit: query.pageSize,
    page: query.page,
  });
}

export async function readOperationsEventPage(page: number) {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "events",
    overrideAccess: true,
    draft: false,
    depth: 1,
    select: {
      title: true,
      summary: true,
      image: true,
      startsAt: true,
      timezone: true,
      location: true,
    },
    populate: mediaPopulation,
    sort: ["-startsAt", "-id"],
    page,
    limit: 20,
  });
  const items: EventOperationsListItem[] = result.docs.map((event) => ({
    id: event.id,
    title: event.title,
    summary: event.summary,
    image: media(event.image),
    startsAt: event.startsAt,
    timezone: event.timezone ?? "Africa/Windhoek",
    location: event.location,
  }));
  return { items, total: result.totalDocs, page, pageSize: 20 };
}
