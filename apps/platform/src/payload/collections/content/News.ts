import type { CollectionConfig, Field } from "payload";
import { prepareContentSlug } from "@/modules/content/ContentSlug";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { seoFields } from "@/payload/fields/seo";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";
import {
  recordCollectionChange,
  recordCollectionDelete,
} from "@/payload/hooks/record-content-audit";
import {
  revalidateCollection,
  revalidateCollectionDelete,
} from "@/payload/hooks/revalidate-public-content";
import { newsPreviewUrl } from "@/payload/admin/preview-url";
import { newsArticleEditor } from "@/payload/fields/NewsArticleEditor";

export const News: CollectionConfig = {
  slug: "news",
  dbName: "cms_news",
  labels: { singular: "News article", plural: "News" },
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "_status", "publishedAt"],
    preview: newsPreviewUrl,
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
  access: cmsCollectionAccess("news"),
  hooks: {
    beforeValidate: [prepareContentSlug],
    afterChange: [recordCollectionChange, revalidateCollection],
    afterDelete: [recordCollectionDelete, revalidateCollectionDelete],
    beforeChange: [collectionPublishGuard("news", { approveOnPublish: true })],
  },
  versions: {
    drafts: {
      autosave: { interval: 2000, showSaveDraftButton: true },
      validate: false,
    },
    maxPerDoc: 50,
  },
  fields: (
    [
      {
        // An unnamed group preserves existing document paths and stored data.
        type: "group",
        label: "News article",
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsNewsContentGroupField.tsx",
          },
        },
        fields: [
          { name: "title", type: "text", required: true },
          {
            name: "slug",
            type: "text",
            required: true,
            unique: true,
            index: true,
            admin: { hidden: true },
          },
          { name: "excerpt", label: "Summary", type: "textarea", required: true },
          {
            name: "body",
            label: "Article",
            type: "richText",
            required: true,
            editor: newsArticleEditor,
            admin: {
              description:
                "Use the toolbar or / menu to add layout sections. Drag the handle beside a section to reorder it; use its controls to edit or remove it.",
            },
          },
          {
            name: "image",
            label: "Article Cover Image",
            type: "upload",
            relationTo: "media",
            filterOptions: { mimeType: { contains: "image/" } },
            admin: {
              description: "Used on news cards and the article header.",
            },
          },
          {
            name: "publishedAt",
            type: "date",
            admin: {
              components: {
                Field: "./modules/content/ui/admin/CmsFormDateInput.tsx",
              },
            },
          },
        ],
      },
      ...[...publishingFields, ...seoFields].map((field): Field => {
        const hiddenField: Field = { ...field };
        hiddenField.admin = { ...hiddenField.admin, hidden: true };
        return hiddenField;
      }),
    ] satisfies Field[]
  ).map(withAppFormInputs),
};
