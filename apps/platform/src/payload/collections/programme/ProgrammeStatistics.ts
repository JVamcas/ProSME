import type { CollectionConfig } from "payload";

import { readPublishedOrCms } from "@/payload/access/can-access-cms";
import { canCreateContent, canDeleteContent, canUpdateContent } from "@/payload/access/can-create-content";
import { enforcePublishCapability } from "@/payload/access/can-publish-content";
import { publishingFields } from "@/payload/fields/publishing";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";

export const ProgrammeStatistics: CollectionConfig = {
  slug: "programme-statistics",
  dbName: "cms_programme_statistics",
  admin: { group: "Programmes", useAsTitle: "label", defaultColumns: ["value", "label", "order", "_status"] },
  access: { create: canCreateContent, delete: canDeleteContent, read: readPublishedOrCms, update: canUpdateContent },
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [enforcePublishCapability] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "value", type: "text", required: true },
    { name: "label", type: "text", required: true },
    { name: "order", type: "number", defaultValue: 0, required: true },
    ...publishingFields,
  ],
};
