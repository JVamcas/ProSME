import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from "payload";

import { hasSavedGlobal } from "@/modules/content/infrastructure/CmsSeedStateRepository";

export { paragraphsToRichText as richText } from "@/modules/content/ContentRichText";

export const seedContext = { skipPublishCapability: true, skipRevalidation: true };

export async function findId(
  payload: Payload,
  collection: CollectionSlug,
  field: string,
  value: string | number,
  req?: PayloadRequest,
) {
  const result = await payload.find({
    collection,
    req,
    depth: 0,
    draft: true,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    select: {},
    where: { [field]: { equals: value } },
  });
  return result.docs[0]?.id;
}

export async function seedGlobalIfMissing<TSlug extends GlobalSlug>(
  payload: Payload,
  options: Parameters<typeof payload.updateGlobal<TSlug, never>>[0],
) {
  if (await hasSavedGlobal(payload, options.slug, options.req)) return;

  await payload.updateGlobal(options);
}
