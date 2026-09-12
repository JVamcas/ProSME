import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";

export const ProgrammeStatistics: CollectionConfig = {
  slug: "programme-statistics",
  dbName: "cms_programme_statistics",
  admin: { group: "Programmes", useAsTitle: "label", defaultColumns: ["value", "label", "order", "_status"] },
  access: cmsCollectionAccess("statistics"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("statistics")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "value", type: "text", required: true },
    { name: "label", type: "text", required: true },
    { name: "order", type: "number", defaultValue: 0, required: true },
    ...publishingFields,
  ],
};
