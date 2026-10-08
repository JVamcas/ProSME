import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import { getContentReadMode } from "./application/ServerContentReadService";
import * as published from "./infrastructure/PublishedContentRepository";
import {
  readResourceBySlug,
  readResourcePage,
} from "./infrastructure/PayloadResourceCentreRepository";
import {
  resourcePageNumber,
  type ResourcePage,
} from "./ResourceCentreTypes";

export async function getResourcePage(
  value?: string | string[],
): Promise<ResourcePage> {
  const page = resourcePageNumber(value);
  const mode = await getContentReadMode("resources");
  return mode.draft
    ? readResourcePage(page, mode)
    : published.readPublishedResourcePage(page);
}

export const getResource = cache(async function getResource(slug: string) {
  const mode = await getContentReadMode("resources");
  return mode.draft
    ? readResourceBySlug(slug, mode)
    : published.readPublishedResource(slug);
});

export async function getResourceSitemapEntries() {
  await connection();
  return published.readPublishedResourceSitemap();
}
