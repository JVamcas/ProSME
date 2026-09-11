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

export const FundingCalls: CollectionConfig = {
  slug: "funding-calls",
  dbName: "cms_funding_calls",
  admin: { group: "Programmes", useAsTitle: "title" },
  access: {
    create: canCreateContent,
    delete: canDeleteContent,
    read: readPublishedOrCms,
    update: canUpdateContent,
  },
  hooks: { beforeChange: [enforcePublishCapability] },
  versions: { drafts: true },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "summary", type: "textarea", required: true },
    { name: "opensAt", type: "date", required: true },
    { name: "closesAt", type: "date", required: true },
    { name: "eligibility", type: "richText", required: true },
    { name: "maximumAmount", type: "number", min: 0 },
    { name: "applicationUrl", type: "text" },
  ],
};
