import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { resourcePreviewUrl } from "@/payload/admin/preview-url";

export const Resources: CollectionConfig = {
  slug: "resources",
  dbName: "cms_resources",
  admin: { group: "Content", useAsTitle: "title", preview: resourcePreviewUrl },
  access: cmsCollectionAccess("resources"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("resources")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "description", type: "textarea", required: true },
    { name: "category", type: "text", required: true },
    { name: "file", type: "upload", relationTo: "media" },
    { name: "thumbnail", type: "upload", relationTo: "media" },
    { name: "externalUrl", type: "text" },
    { name: "publishedAt", type: "date" },
    ...publishingFields,
    ...seoFields,
  ],
};
