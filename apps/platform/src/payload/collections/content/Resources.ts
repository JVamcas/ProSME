import type { CollectionConfig, Field } from "payload";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import {
  recordCollectionChange,
  recordCollectionDelete,
} from "@/payload/hooks/record-content-audit";
import {
  revalidateCollection,
  revalidateCollectionDelete,
} from "@/payload/hooks/revalidate-public-content";
import { resourcePreviewUrl } from "@/payload/admin/preview-url";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";
import { resourceContentFields } from "@/payload/fields/ResourceContentFields";
import { prepareResource } from "@/modules/content/ResourcePublishing";

export const Resources: CollectionConfig = {
  slug: "resources",
  dbName: "cms_resources",
  labels: { singular: "Resource", plural: "Resource Centre" },
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["resourceName", "title", "_status", "publishedAt"],
    preview: resourcePreviewUrl,
    pagination: { defaultLimit: 12, limits: [12, 24, 48] },
    components: {
      edit: {
        SaveDraftButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveDraftButton",
        PublishButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsPublishButton",
      },
    },
  },
  access: cmsCollectionAccess("resources"),
  hooks: {
    afterChange: [recordCollectionChange, revalidateCollection],
    afterDelete: [recordCollectionDelete, revalidateCollectionDelete],
    beforeValidate: [prepareResource],
    beforeChange: [
      collectionPublishGuard("resources", { approveOnPublish: true }),
    ],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: (
    [
      ...resourceContentFields,
      { name: "publishedAt", type: "date", admin: { hidden: true } },
      // Preserve older category metadata; resourceName owns the visible label.
      { name: "category", type: "text", admin: { hidden: true } },
      // Keep stored review/SEO metadata while using native draft/publish actions.
      ...[...publishingFields, ...seoFields].map((field): Field => {
        const hiddenField: Field = { ...field };
        hiddenField.admin = { ...hiddenField.admin, hidden: true };
        return hiddenField;
      }),
    ] satisfies Field[]
  ).map(withAppFormInputs),
};
