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

export const Pages: CollectionConfig = {
  slug: "pages",
  dbName: "cms_pages",
  admin: { group: "Content", useAsTitle: "title", defaultColumns: ["title", "slug", "updatedAt"] },
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
    { name: "slug", type: "text", required: true, unique: true, index: true },
    { name: "summary", type: "textarea" },
    { name: "content", type: "richText", required: true },
    { name: "featuredImage", type: "upload", relationTo: "media" },
    { name: "seoTitle", type: "text" },
    { name: "seoDescription", type: "textarea", maxLength: 160 },
  ],
};
