import type { CollectionConfig } from "payload";

import { cmsMediaAccess } from "@/payload/access/cms-resource-access";
import { cmsImageSizes } from "@/modules/content/ContentImageSizes";
import { organizeCmsMedia } from "@/modules/content/infrastructure/CmsMediaStorage";

export const Media: CollectionConfig = {
  slug: "media",
  dbName: "cms_media",
  admin: {
    group: "Content",
    useAsTitle: "alt",
    components: {
      edit: {
        SaveButton: "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveButton",
      },
    },
  },
  access: cmsMediaAccess(),
  hooks: { beforeChange: [organizeCmsMedia] },
  upload: {
    adminThumbnail: "thumbnail",
    imageSizes: cmsImageSizes.map(({ name, width }) => ({
      name,
      width,
      withoutEnlargement: true,
      generateImageName: ({ originalName, extension }) =>
        `${originalName}-${name}.${extension}`,
    })),
    mimeTypes: ["image/*", "application/pdf"],
    staticDir: "media",
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        components: {
          Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormInput",
        },
      },
    },
    {
      name: "caption",
      type: "textarea",
      admin: {
        components: {
          Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormTextarea",
        },
      },
    },
  ],
};
