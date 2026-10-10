import "server-only";

import { getPayload } from "payload";
import configPromise from "@payload-config";
import type { News, Resource } from "@/payload-types";
import { media, resourceHref, resourceThumbnail } from "./ContentProjection";
import {
  HOME_FEED_LIMIT,
  selectLatestHomeItems,
  type HomeFeedItem,
} from "../domain/HomeFeedSelection";

async function payloadClient() {
  return getPayload({ config: configPromise });
}

export async function readHomeFeed(): Promise<HomeFeedItem[]> {
  const payload = await payloadClient();
  const [news, resources] = await Promise.all([
    homeItems(payload, "news"),
    homeItems(payload, "resources"),
  ]);

  return selectLatestHomeItems(
    [...news, ...resources],
    (item) => item.date ?? "",
  );
}

async function homeItems(
  payload: Awaited<ReturnType<typeof payloadClient>>,
  collection: "news" | "resources",
): Promise<HomeFeedItem[]> {
  const select = collection === "news"
    ? {
        id: true,
        createdAt: true,
        publishedAt: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
      } as const
    : {
        id: true,
        createdAt: true,
        publishedAt: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        resourceName: true,
        externalUrl: true,
        file: true,
        thumbnail: true,
      } as const;
  const [dated, undated] = await Promise.all([
    payload.find({
      collection,
      depth: collection === "resources" ? 2 : 1,
      draft: false,
      limit: HOME_FEED_LIMIT,
      overrideAccess: true,
      select,
      sort: ["-publishedAt", "-id"],
      where: {
        and: [
          { _status: { equals: "published" } },
          { publishedAt: { exists: true } },
        ],
      },
    }),
    payload.find({
      collection,
      depth: collection === "resources" ? 2 : 1,
      draft: false,
      limit: HOME_FEED_LIMIT,
      overrideAccess: true,
      select,
      sort: ["-createdAt", "-id"],
      where: {
        and: [
          { _status: { equals: "published" } },
          { publishedAt: { exists: false } },
        ],
      },
    }),
  ]);

  // Each query returns at most four candidates. Merge the date groups before
  // combining collections so undated records can rank by their creation date.
  const items = selectLatestHomeItems(
    [...dated.docs, ...undated.docs],
    (item) => item.publishedAt ?? item.createdAt,
  );

  if (collection === "news") {
    return (items as News[]).map((item) => ({
      kind: "news",
      id: item.id,
      image: media(item.image),
      slug: item.slug,
      summary: item.excerpt,
      title: item.title,
      date: item.publishedAt ?? item.createdAt,
    }));
  }

  return (items as Resource[]).map((item) => ({
    kind: "resource",
    id: item.id,
    category: item.resourceName || item.category || "Resource",
    href: resourceHref(item.file, item.externalUrl),
    image: resourceThumbnail(item.thumbnail, item.file),
    slug: item.slug,
    summary: item.description,
    title: item.title,
    date: item.publishedAt ?? item.createdAt,
  }));
}
