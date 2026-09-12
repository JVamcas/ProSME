import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { newsPreviewUrl } from "@/payload/admin/preview-url";

export const News: CollectionConfig = {
  slug: "news",
  dbName: "cms_news",
  admin: { group: "Content", useAsTitle: "title", defaultColumns: ["title", "publishedAt"], preview: newsPreviewUrl },
  access: cmsCollectionAccess("news"),
  hooks: { afterChange: [recordCollectionChange, revalidateCollection], afterDelete: [recordCollectionDelete, revalidateCollectionDelete], beforeChange: [collectionPublishGuard("news")] },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "excerpt", type: "textarea", required: true },
    { name: "body", type: "richText", required: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "publishedAt", type: "date" },
    ...publishingFields,
    ...seoFields,
  ],
};
