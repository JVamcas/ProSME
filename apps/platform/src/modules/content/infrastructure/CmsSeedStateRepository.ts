import "server-only";

import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from "payload";

export async function hasCollectionSeedHistory(
  payload: Payload,
  collection: CollectionSlug,
  req?: Partial<PayloadRequest>,
): Promise<boolean> {
  const [content, history] = await Promise.all([
    payload.find({
      collection,
      req,
      depth: 0,
      draft: true,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      // Payload includes id automatically in an empty inclusion projection.
      select: {},
    }),
    payload.find({
      collection: "content-audit-entries",
      req,
      depth: 0,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      select: {},
      where: { collection: { equals: collection } },
    }),
  ]);

  // Audit history also preserves a collection whose editors deleted every item.
  return content.docs.length > 0 || history.docs.length > 0;
}

export async function hasSavedGlobal(
  payload: Payload,
  slug: GlobalSlug,
  req?: Partial<PayloadRequest>,
): Promise<boolean> {
  const current = await payload.findGlobal({
    slug,
    req,
    depth: 0,
    draft: true,
    overrideAccess: true,
    select: { createdAt: true, updatedAt: true },
  });

  // Payload returns field defaults even when the global has never been saved.
  return Boolean(current.createdAt || current.updatedAt);
}
