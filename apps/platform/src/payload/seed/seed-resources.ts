import { fileURLToPath } from "node:url";
import type { Payload } from "payload";

import { findId, seedContext } from "./seed-helpers";

const fundingCriteriaThumbnailAlt =
  "First Call for Applications funding criteria guide";

async function seedFundingCriteriaThumbnail(payload: Payload) {
  const current = await findId(
    payload,
    "media",
    "alt",
    fundingCriteriaThumbnailAlt,
  );

  if (current) {
    return current;
  }

  const created = await payload.create({
    collection: "media",
    context: seedContext,
    data: { alt: fundingCriteriaThumbnailAlt },
    filePath: fileURLToPath(
      new URL(
        "../../../public/images/first-call-funding-criteria-thumbnail.png",
        import.meta.url,
      ),
    ),
    overrideAccess: true,
  });

  return created.id;
}

export async function seedResources(payload: Payload) {
  const slug = "first-call-funding-criteria";
  const [resourceId, thumbnailId] = await Promise.all([
    findId(payload, "resources", "slug", slug),
    seedFundingCriteriaThumbnail(payload),
  ]);
  const resource = {
    category: "Application guide",
    description: "Approved application criteria and supporting-document requirements for the SME Fund’s first call.",
    externalUrl: "/documents/sme-fund-first-call-funding-criteria.pdf",
    publishedAt: "2026-06-10T00:00:00.000Z",
    reviewStatus: "approved" as const,
    slug,
    thumbnail: thumbnailId,
    title: "First Call funding criteria",
    _status: "published" as const,
  };
  if (resourceId) {
    await payload.update({
      collection: "resources",
      context: seedContext,
      data: resource,
      id: resourceId,
      overrideAccess: true,
    });
    return;
  }
  await payload.create({
    collection: "resources",
    context: seedContext,
    data: resource,
    overrideAccess: true,
  });
}
