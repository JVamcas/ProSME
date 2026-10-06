import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Field, PayloadRequest } from "payload";

import { approvedPageParagraphs, defaultPages } from "@/modules/content/ContentDefaults";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { withAppFormInputs } from "./withAppFormInputs";
import { publishingFields } from "./publishing";
import { seoFields } from "./seo";
import { pageContentBlocks } from "@/payload/blocks/public-content";

function showPageSettings(data: Record<string, unknown>) {
  return data.slug !== "about";
}

function aboutDefault(req: PayloadRequest, value: unknown) {
  return req.query?.cmsPage === "about" ? value : undefined;
}

export const pageSlugField: Field = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  defaultValue: ({ req }) => aboutDefault(req, "about"),
  admin: {
    condition: showPageSettings,
  },
};

const contentFields: Field[] = [
  {
    name: "title",
    label: "Heading",
    type: "text",
    required: true,
    defaultValue: ({ req }) => aboutDefault(req, defaultPages.about.title),
  },
  {
    name: "summary",
    label: "Introduction",
    type: "textarea",
    defaultValue: ({ req }) => aboutDefault(req, defaultPages.about.summary),
  },
  {
    name: "content",
    label: "Body content",
    type: "richText",
    required: true,
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => [
        ...defaultFeatures,
        FixedToolbarFeature(),
      ],
    }),
    defaultValue: ({ req }) =>
      aboutDefault(req, paragraphsToRichText(approvedPageParagraphs.about)),
  },
  {
    name: "featuredImage",
    label: "Banner image (optional)",
    type: "upload",
    relationTo: "media",
    admin: { condition: showPageSettings },
  },
];

// The unnamed group keeps the existing Pages document paths intact.
export const pageContentFields: Field[] = [
  {
    type: "group",
    label: "Page content",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsAboutContentGroupField.tsx",
      },
    },
    fields: contentFields.map(withAppFormInputs),
  },
];

const settingsFields: Field[] = [
  { name: "layout", type: "blocks", blocks: pageContentBlocks },
  ...publishingFields,
  ...seoFields,
];

export const pageSettingsFields: Field[] = settingsFields.map((field): Field => {
  const settingsField: Field = { ...field };
  settingsField.admin = {
    ...settingsField.admin,
    condition: showPageSettings,
  };
  return settingsField;
});
