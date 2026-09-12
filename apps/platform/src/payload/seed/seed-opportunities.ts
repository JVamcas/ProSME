import type { Payload } from "payload";

import { findId, richText, seedContext } from "./seed-helpers";

export async function seedResourceAndCall(payload: Payload) {
  const resourceSlug = "first-call-funding-criteria";
  const resourceId = await findId(payload, "resources", "slug", resourceSlug);
  const resource = {
    category: "Application guide",
    description: "Approved application criteria and supporting-document requirements for the SME Fund’s first call.",
    externalUrl: "/documents/sme-fund-first-call-funding-criteria.pdf",
    publishedAt: "2026-06-10T00:00:00.000Z",
    reviewStatus: "approved" as const,
    slug: resourceSlug,
    title: "First Call funding criteria",
    _status: "published" as const,
  };
  if (resourceId) {
    await payload.update({ collection: "resources", id: resourceId, data: resource, context: seedContext, overrideAccess: true });
  } else {
    await payload.create({ collection: "resources", data: resource, context: seedContext, overrideAccess: true });
  }

  const callSlug = "first-call-for-applications";
  const callId = await findId(payload, "funding-calls", "slug", callSlug);
  const call = {
    applicationUrl: null,
    callStatus: "closed" as const,
    closesAt: "2026-07-24T21:59:59.000Z",
    eligibility: richText([
      "The first call for applications closed on 24 July 2026.",
      "Applicants were required to be at least 51% Namibian-owned, compliant with relevant statutory institutions, registered on the NIPDB MSME database and operating for at least one year.",
    ]),
    maximumAmount: 100000,
    minimumAmount: 50000,
    opensAt: "2026-06-10T00:00:00.000Z",
    reviewStatus: "approved" as const,
    slug: callSlug,
    summary: "The first SME Fund call is closed. Its published criteria remain available for reference.",
    title: "First Call for Applications",
    _status: "published" as const,
  };
  if (callId) {
    await payload.update({ collection: "funding-calls", id: callId, data: call, context: seedContext, overrideAccess: true });
  } else {
    await payload.create({ collection: "funding-calls", data: call, context: seedContext, overrideAccess: true });
  }
}
