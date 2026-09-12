import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";

export const FAQs: CollectionConfig = {
  slug: "faqs",
  dbName: "cms_faqs",
  admin: { group: "Content", useAsTitle: "question", defaultColumns: ["question", "category", "order", "_status"], preview: () => "/api/preview?path=%2Ffaq" },
  access: cmsCollectionAccess("faqs"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("faqs")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "question", type: "text", required: true },
    { name: "answer", type: "richText", required: true },
    { name: "category", type: "text", defaultValue: "General", required: true },
    { name: "order", type: "number", defaultValue: 0, required: true },
    ...publishingFields,
  ],
};
