import type { CollectionSlug, Payload } from "payload";

import type { Faq, FundingCall, Page } from "../../payload-types";

export const seedContext = { skipPublishCapability: true, skipRevalidation: true };
export type SeedRichText = Page["content"] & Faq["answer"] & FundingCall["eligibility"];

export function richText(paragraphs: readonly string[]): SeedRichText {
  return {
    root: {
      type: "root",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        children: [{ type: "text", text, version: 1 }],
        direction: null,
        format: "",
        indent: 0,
        version: 1,
        textFormat: 0,
        textStyle: "",
      })),
      direction: null,
      format: "",
      indent: 0,
      version: 1,
    },
  } as SeedRichText;
}

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
