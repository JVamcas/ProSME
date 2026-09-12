import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { eventPreviewUrl } from "@/payload/admin/preview-url";

export const Events: CollectionConfig = {
  slug: "events",
  dbName: "cms_events",
  admin: { group: "Content", useAsTitle: "title", defaultColumns: ["title", "startsAt", "_status"], preview: eventPreviewUrl },
  access: cmsCollectionAccess("events"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("events")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "summary", type: "textarea", required: true },
    { name: "body", type: "richText", required: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "startsAt", type: "date", required: true },
    { name: "endsAt", type: "date" },
    { name: "location", type: "text", required: true },
    { name: "registrationUrl", type: "text" },
    ...publishingFields,
    ...seoFields,
  ],
};
