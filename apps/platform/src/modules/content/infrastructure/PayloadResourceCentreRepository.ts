import "server-only";

import { getPayload, type Where } from "payload";
import configPromise from "@payload-config";
import type { Resource } from "@/payload-types";
import type { ListingItem } from "../ContentTypes";
import { RESOURCE_PAGE_SIZE, type ResourcePage } from "../ResourceCentreTypes";
import { resourceHref, resourceThumbnail } from "./ContentProjection";

type ResourceReadMode = { draft: boolean; where: Where };

const listingSelection = {
  resourceName: true,
  category: true,
  publishedAt: true,
  title: true,
  slug: true,
  description: true,
  file: true,
  thumbnail: true,
  externalUrl: true,
} as const;

type ResourceListing = Pick<Resource, "id" | keyof typeof listingSelection>;

function resourceItem(item: ResourceListing): ListingItem {
  return {
    id: item.id,
    category: item.resourceName || item.category || "Resource",
    date: item.publishedAt,
    href: resourceHref(item.file, item.externalUrl),
    image: resourceThumbnail(item.thumbnail, item.file),
    slug: item.slug,
    summary: item.description,
    title: item.title,
  };
}

export async function readResourceSitemap() {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "resources",
    depth: 0,
    draft: false,
    overrideAccess: true,
    select: { slug: true, updatedAt: true },
    where: {
      and: [
        { _status: { equals: "published" } },
        { excludeFromSearch: { not_equals: true } },
      ],
    },
    sort: "id",
    limit: 50_000,
    pagination: false,
  });
  return result.docs.map(({ slug, updatedAt }) => ({ slug, updatedAt }));
}

export async function readResourcePage(
  page: number,
  mode: ResourceReadMode,
): Promise<ResourcePage> {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "resources",
    depth: 2,
    draft: mode.draft,
    overrideAccess: true,
    where: mode.where,
    select: listingSelection,
    page,
    limit: RESOURCE_PAGE_SIZE,
    pagination: true,
    sort: ["-publishedAt", "-createdAt", "-id"],
    populate: {
      media: {
        alt: true,
        url: true,
        width: true,
        height: true,
        sizes: true,
        mimeType: true,
        documentThumbnail: true,
      },
    },
  });
  return {
    items: result.docs.map(resourceItem),
    page,
    pageSize: RESOURCE_PAGE_SIZE,
    total: result.totalDocs,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
  };
}

export async function readResourceBySlug(slug: string, mode: ResourceReadMode) {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "resources",
    depth: 2,
    draft: mode.draft,
    overrideAccess: true,
    where: { and: [mode.where, { slug: { equals: slug } }] },
    select: {
      ...listingSelection,
      body: true,
      seoTitle: true,
      seoDescription: true,
      excludeFromSearch: true,
    },
    limit: 1,
    pagination: false,
  });
  const item = result.docs[0];
  if (!item) return null;
  return {
    ...resourceItem(item),
    body: item.body,
    seoTitle: item.seoTitle,
    seoDescription: item.seoDescription,
    excludeFromSearch: item.excludeFromSearch,
  };
}
