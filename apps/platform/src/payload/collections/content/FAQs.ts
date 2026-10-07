import type { CollectionConfig, Field } from "payload";
import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";

import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { publishingFields } from "@/payload/fields/publishing";
import { recordCollectionChange, recordCollectionDelete } from "@/payload/hooks/record-content-audit";
import { revalidateCollection, revalidateCollectionDelete } from "@/payload/hooks/revalidate-public-content";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";

export const FAQs: CollectionConfig = {
  slug: "faqs",
  dbName: "cms_faqs",
  admin: {
    group: "Content",
    useAsTitle: "question",
    defaultColumns: ["question", "category", "order", "_status"],
    preview: () => "/api/preview?path=%2Ffaq",
  },
  access: cmsCollectionAccess("faqs"),
  hooks: {
    afterChange: [recordCollectionChange, revalidateCollection],
    afterDelete: [recordCollectionDelete, revalidateCollectionDelete],
    beforeChange: [collectionPublishGuard("faqs", { approveOnPublish: true })],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: ([
    {
      name: "question",
      label: "Question",
      type: "text",
      required: true,
    },
    {
      name: "answer",
      label: "Answer",
      type: "richText",
      required: true,
      editor: lexicalEditor({
        features: ({ defaultFeatures }) => [
          ...defaultFeatures,
          FixedToolbarFeature(),
        ],
      }),
    },
    {
      name: "category",
      type: "text",
      defaultValue: "General",
      required: true,
      admin: { hidden: true },
    },
    {
      name: "order",
      label: "Display order",
      type: "number",
      defaultValue: 0,
      required: true,
    },
    ...publishingFields.map((field): Field => {
      const hiddenField: Field = { ...field };
      hiddenField.admin = { ...hiddenField.admin, hidden: true };
      return hiddenField;
    }),
  ] satisfies CollectionConfig["fields"]).map(withAppFormInputs),
};
