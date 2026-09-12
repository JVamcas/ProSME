import type { CollectionConfig } from "payload";

import {
  readPublishedOrCms,
} from "@/payload/access/can-access-cms";
import {
  canCreateContent,
  canDeleteContent,
  canUpdateContent,
} from "@/payload/access/can-create-content";
import { enforcePublishCapability } from "@/payload/access/can-publish-content";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { fundingPreviewUrl } from "@/payload/admin/preview-url";

export const FundingCalls: CollectionConfig = {
  slug: "funding-calls",
  dbName: "cms_funding_calls",
  admin: { group: "Programmes", useAsTitle: "title", preview: fundingPreviewUrl },
  access: {
    create: canCreateContent,
    delete: canDeleteContent,
    read: readPublishedOrCms,
    update: canUpdateContent,
  },
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [enforcePublishCapability] },
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
