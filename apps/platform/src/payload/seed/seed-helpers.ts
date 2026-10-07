import type { CollectionSlug, Payload } from "payload";

export { paragraphsToRichText as richText } from "@/modules/content/ContentRichText";

export const seedContext = { skipPublishCapability: true, skipRevalidation: true };

export async function findId(
  payload: Payload,
  collection: CollectionSlug,
  field: string,
  value: string | number,
) {
  const result = await payload.find({
    collection,
    limit: 1,
    overrideAccess: true,
    where: { [field]: { equals: value } },
  });
  return result.docs[0]?.id;
}
