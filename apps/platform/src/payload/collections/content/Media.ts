import type { CollectionConfig } from "payload";

import { cmsMediaAccess } from "@/payload/access/cms-resource-access";
import { cmsImageSizes } from "@/modules/content/ContentImageSizes";
import { organizeCmsMedia } from "@/modules/content/infrastructure/CmsMediaStorage";

export const Media: CollectionConfig = {
  slug: "media",
  dbName: "cms_media",
  admin: { group: "Content", useAsTitle: "alt" },
  access: cmsMediaAccess(),
  hooks: { beforeChange: [organizeCmsMedia] },
  upload: {
    adminThumbnail: "thumbnail",
    imageSizes: cmsImageSizes.map(({ name, width }) => ({
      name,
      width,
      withoutEnlargement: true,
    })),
    mimeTypes: ["image/*", "application/pdf"],
    staticDir: "media",
  },
  fields: [
    { name: "alt", type: "text", required: true },
    { name: "caption", type: "textarea" },
  ],
};
