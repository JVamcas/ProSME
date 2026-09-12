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
import { resourcePreviewUrl } from "@/payload/admin/preview-url";

export const Resources: CollectionConfig = {
  slug: "resources",
  dbName: "cms_resources",
  admin: { group: "Content", useAsTitle: "title", preview: resourcePreviewUrl },
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
