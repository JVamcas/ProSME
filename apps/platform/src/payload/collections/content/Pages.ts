import type { CollectionConfig } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { pagePreviewUrl } from "@/payload/admin/preview-url";
import {
  pageContentFields,
  pageSettingsFields,
  pageSlugField,
} from "@/payload/fields/PageContentFields";

export const Pages: CollectionConfig = {
  slug: "pages",
  dbName: "cms_pages",
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "slug", "updatedAt"],
    preview: pagePreviewUrl,
    components: {
      edit: {
        SaveDraftButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveDraftButton",
        PublishButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsPublishButton",
      },
    },
  },
  access: cmsCollectionAccess("pages"),
  hooks: {
    afterChange: [recordCollectionChange, revalidateCollection],
    afterDelete: [recordCollectionDelete, revalidateCollectionDelete],
    beforeChange: [
      collectionPublishGuard("pages", ({ data, originalDoc }) => ({
        approveOnPublish: (data.slug ?? originalDoc?.slug) === "about",
      })),
    ],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: [
    pageSlugField,
    ...pageContentFields,
    ...pageSettingsFields,
  ],
};
