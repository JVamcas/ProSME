import "server-only";

import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";

import {
  PUBLISHED_CONTENT_REVALIDATE_SECONDS,
  publishedContentTag,
} from "../domain/PublishedContentPolicy";

// Next's default tag invalidation state is process-local. Never reuse files
// from a previous process after those invalidation records have been lost.
const runtimeCacheNamespace = randomUUID();

// Callers supply only published reads. Request identity and preview authorization
// must be resolved before entering this cache, never inside its callback.
export function cachePublishedContent<Arguments extends unknown[], Result>(
  read: (...args: Arguments) => Promise<Result>,
  key: string,
  sources: string[],
) {
  return unstable_cache(
    read,
    [
      "cms-published-v1",
      process.env.ENVIRONMENT ?? "local",
      runtimeCacheNamespace,
      key,
    ],
    {
      revalidate: PUBLISHED_CONTENT_REVALIDATE_SECONDS,
      tags: [...new Set([...sources, "media"])].map(publishedContentTag),
    },
  );
}
