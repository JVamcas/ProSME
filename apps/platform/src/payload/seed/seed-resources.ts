import type { Payload } from "payload";

import { findId, seedContext } from "./seed-helpers";

export async function seedResources(payload: Payload) {
  const slug = "first-call-funding-criteria";
  const resourceId = await findId(payload, "resources", "slug", slug);
  const resource = {
    category: "Application guide",
    description: "Approved application criteria and supporting-document requirements for the SME Fund’s first call.",
    externalUrl: "/documents/sme-fund-first-call-funding-criteria.pdf",
    publishedAt: "2026-06-10T00:00:00.000Z",
    reviewStatus: "approved" as const,
    slug,
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

