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

export const News: CollectionConfig = {
  slug: "news",
  dbName: "cms_news",
  admin: { group: "Content", useAsTitle: "title", defaultColumns: ["title", "publishedAt"] },
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
    { name: "excerpt", type: "textarea", required: true },
    { name: "body", type: "richText", required: true },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "publishedAt", type: "date" },
  ],
};
