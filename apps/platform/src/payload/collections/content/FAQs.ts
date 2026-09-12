import type { CollectionConfig } from "payload";

import { readPublishedOrCms } from "@/payload/access/can-access-cms";
import { canCreateContent, canDeleteContent, canUpdateContent } from "@/payload/access/can-create-content";
import { enforcePublishCapability } from "@/payload/access/can-publish-content";
import { publishingFields } from "@/payload/fields/publishing";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";

export const FAQs: CollectionConfig = {
  slug: "faqs",
  dbName: "cms_faqs",
  admin: { group: "Content", useAsTitle: "question", defaultColumns: ["question", "category", "order", "_status"], preview: () => "/api/preview?path=%2Ffaq" },
  access: { create: canCreateContent, delete: canDeleteContent, read: readPublishedOrCms, update: canUpdateContent },
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [enforcePublishCapability] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "question", type: "text", required: true },
    { name: "answer", type: "richText", required: true },
    { name: "category", type: "text", defaultValue: "General", required: true },
    { name: "order", type: "number", defaultValue: 0, required: true },
    ...publishingFields,
  ],
};
