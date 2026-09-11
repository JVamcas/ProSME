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

export const Resources: CollectionConfig = {
  slug: "resources",
  dbName: "cms_resources",
  admin: { group: "Content", useAsTitle: "title" },
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
    { name: "description", type: "textarea", required: true },
    { name: "category", type: "text", required: true },
    { name: "file", type: "upload", relationTo: "media" },
    { name: "externalUrl", type: "text" },
  ],
};
