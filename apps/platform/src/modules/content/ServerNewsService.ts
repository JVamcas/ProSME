import "server-only";

import { cache } from "react";
import { getContentReadMode } from "./application/ServerContentReadService";
import { readNewsById } from "./infrastructure/PayloadContentRepository";
import { readPublishedNewsArticle } from "./infrastructure/PublishedContentRepository";
import { newsItem } from "./infrastructure/ContentProjection";

export const getNewsArticle = cache(async function getNewsArticle(value: string) {
  if (!/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id)) return null;

  const mode = await getContentReadMode("news");
  const item = mode.draft
    ? await readNewsById(id, mode)
    : await readPublishedNewsArticle(id);
  return item ? newsItem(item) : null;
});
