import type { CollectionConfig } from "payload";

import { cmsMediaAccess } from "@/payload/access/cms-resource-access";
import {
  cmsImageFormatOptions,
  cmsImageSizes,
} from "@/modules/content/ContentImageSizes";
import { organizeCmsMedia } from "@/modules/content/infrastructure/CmsMediaStorage";
import { generateDocumentThumbnail } from "@/modules/content/ServerResourceThumbnailService";
import { resourceDocumentMimeTypes } from "@/modules/content/ResourceDocumentTypes";

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
  hooks: { beforeChange: [organizeCmsMedia, generateDocumentThumbnail] },
  upload: {
    adminThumbnail: "thumbnail",
    imageSizes: cmsImageSizes.map(({ name, width }) => ({
      name,
      width,
      withoutEnlargement: true,
      formatOptions: cmsImageFormatOptions,
      generateImageName: ({ originalName, extension }) =>
        `${originalName}-${name}.${extension}`,
    })),
    mimeTypes: ["image/*", ...resourceDocumentMimeTypes.filter((type) => !type.startsWith("image/"))],
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
    {
      name: "documentThumbnail",
      type: "upload",
      relationTo: "media",
      admin: { hidden: true, readOnly: true },
    },
  ],
};
