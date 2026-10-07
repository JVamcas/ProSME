import { fileURLToPath } from "node:url";
import type { Payload, PayloadRequest } from "payload";

import { hasCollectionSeedHistory } from "@/modules/content/infrastructure/CmsSeedStateRepository";
import { findId, seedContext } from "./seed-helpers";

const fundingCriteriaThumbnailAlt =
  "First Call for Applications funding criteria guide";

async function seedFundingCriteriaThumbnail(payload: Payload, req?: PayloadRequest) {
  const current = await findId(
    payload,
    "media",
    "alt",
    fundingCriteriaThumbnailAlt,
    req,
  );

  if (current) {
    return current;
  }

  const created = await payload.create({
    collection: "media",
    context: seedContext,
    req,
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

export async function seedResources(payload: Payload, req?: PayloadRequest) {
  if (await hasCollectionSeedHistory(payload, "resources", req)) return;

  const slug = "first-call-funding-criteria";
  const thumbnailId = await seedFundingCriteriaThumbnail(payload, req);
  const resource = {
    resourceName: "Application guide",
    category: "Application guide",
    description:
      "Approved application criteria and supporting-document requirements for the SME Fund’s first call.",
    externalUrl: "/documents/sme-fund-first-call-funding-criteria.pdf",
    publishedAt: "2026-06-10T00:00:00.000Z",
    reviewStatus: "approved" as const,
    slug,
    thumbnail: thumbnailId,
    title: "First Call funding criteria",
    _status: "published" as const,
  };
  await payload.create({
    collection: "resources",
    context: seedContext,
    req,
    data: resource,
    overrideAccess: true,
  });
}
