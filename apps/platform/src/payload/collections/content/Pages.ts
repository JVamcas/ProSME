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
import { pagePreviewUrl } from "@/payload/admin/preview-url";
import { pageContentBlocks } from "@/payload/blocks/public-content";

export const Pages: CollectionConfig = {
  slug: "pages",
  dbName: "cms_pages",
  admin: { group: "Content", useAsTitle: "title", defaultColumns: ["title", "slug", "updatedAt"], preview: pagePreviewUrl },
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
    { name: "summary", type: "textarea" },
    { name: "content", type: "richText", required: true },
    { name: "layout", type: "blocks", blocks: pageContentBlocks },
    { name: "featuredImage", type: "upload", relationTo: "media" },
    ...publishingFields,
    ...seoFields,
  ],
};
