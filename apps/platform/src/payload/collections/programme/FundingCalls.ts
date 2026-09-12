import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { fundingPreviewUrl } from "@/payload/admin/preview-url";

export const FundingCalls: CollectionConfig = {
  slug: "funding-calls",
  dbName: "cms_funding_calls",
  admin: { group: "Programmes", useAsTitle: "title", preview: fundingPreviewUrl },
  access: cmsCollectionAccess("funding-calls"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("funding-calls")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "summary", type: "textarea", required: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "opensAt", type: "date", required: true },
    { name: "closesAt", type: "date", required: true },
    { name: "callStatus", type: "select", options: ["upcoming", "open", "closed"], defaultValue: "upcoming", required: true },
    { name: "eligibility", type: "richText", required: true },
    { name: "minimumAmount", type: "number", min: 0 },
    { name: "maximumAmount", type: "number", min: 0 },
    { name: "applicationUrl", type: "text" },
    ...publishingFields,
    ...seoFields,
  ],
};
