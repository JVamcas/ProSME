import "server-only";

import { getPayload } from "payload";
import configPromise from "@payload-config";

import { fundingOverviewSections } from "../FundingOverviewSections";

export async function readFundingOverviewDocuments(draft: boolean) {
  const payload = await getPayload({ config: configPromise });
  const result = await payload.find({
    collection: "pages",
    depth: 0,
    draft,
    limit: 3,
    pagination: false,
    overrideAccess: true,
    select: { slug: true, layout: true },
    where: {
      and: [
        { slug: { in: Object.keys(fundingOverviewSections) } },
        ...(draft ? [] : [{ _status: { equals: "published" } }]),
      ],
    },
  });
  return result.docs;
}
