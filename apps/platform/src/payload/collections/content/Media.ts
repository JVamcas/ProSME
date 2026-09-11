import type { CollectionConfig } from "payload";

import {
  readPublicContent,
} from "@/payload/access/can-access-cms";
import {
  canCreateContent,
  canDeleteContent,
  canUpdateContent,
} from "@/payload/access/can-create-content";

export const Media: CollectionConfig = {
  slug: "media",
  dbName: "cms_media",
  admin: { group: "Content", useAsTitle: "alt" },
  access: {
    create: canCreateContent,
    delete: canDeleteContent,
    read: readPublicContent,
    update: canUpdateContent,
  },
  upload: {
    mimeTypes: ["image/*", "application/pdf"],
    staticDir: "media",
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "textarea" },
  ],
};
