import type { CollectionConfig } from "payload";

import { cmsMediaAccess } from "@/payload/access/cms-resource-access";

export const Media: CollectionConfig = {
  slug: "media",
  dbName: "cms_media",
  admin: { group: "Content", useAsTitle: "alt" },
  access: cmsMediaAccess(),
  upload: {
    mimeTypes: ["image/*", "application/pdf"],
    staticDir: "media",
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "textarea" },
  ],
};
