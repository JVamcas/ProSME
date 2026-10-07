import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Field, PayloadRequest } from "payload";

import { approvedPageParagraphs, defaultPages } from "@/modules/content/ContentDefaults";
import { paragraphsToRichText } from "@/modules/content/ContentRichText";
import { cmsPageEditor } from "@/modules/content/CmsPageEditors";
import { withAppFormInputs } from "./withAppFormInputs";
import { publishingFields } from "./publishing";
import { seoFields } from "./seo";

function showPageSettings(data: Record<string, unknown>) {
  return !cmsPageEditor(data.slug);
}

function pageDefault(
  req: PayloadRequest,
  field: "slug" | "title" | "summary" | "content" | "eyebrow",
) {
  const slug = req.query?.cmsPage;
  if (typeof slug !== "string" || !cmsPageEditor(slug)) return undefined;
  if (field === "slug") return slug;
  if (field === "content") {
    return paragraphsToRichText(approvedPageParagraphs[slug]);
  }
  return defaultPages[slug][field];
}

export const pageSlugField: Field = {
  name: "slug",
  type: "text",
  required: true,
  unique: true,
  index: true,
  defaultValue: ({ req }) => pageDefault(req, "slug"),
  admin: {
    condition: showPageSettings,
  },
};

const contentFields: Field[] = [
  {
    name: "eyebrow",
    label: "Banner label",
    type: "text",
    defaultValue: ({ req }) => pageDefault(req, "eyebrow"),
    admin: {
      condition: (data) => data.slug === "how-to-apply" || data.slug === "faq",
    },
  },
  {
    name: "title",
    label: "Heading",
    type: "text",
    required: true,
    defaultValue: ({ req }) => pageDefault(req, "title"),
    admin: { condition: (data) => data.slug !== "funding" && data.slug !== "eligibility" },
  },
  {
    name: "summary",
    label: "Introduction",
    type: "textarea",
    defaultValue: ({ req }) => pageDefault(req, "summary"),
    admin: { condition: (data) => data.slug !== "funding" && data.slug !== "eligibility" },
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
    defaultValue: ({ req }) => pageDefault(req, "content"),
    admin: {
      condition: (data) => data.slug !== "funding" && data.slug !== "eligibility" && data.slug !== "faq",
    },
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
      condition: (data) => data.slug !== "funding" && data.slug !== "eligibility",
      components: {
        Field: "./modules/content/ui/admin/CmsPageContentGroupField.tsx",
      },
    },
    fields: contentFields.map(withAppFormInputs),
  },
];

const settingsFields: Field[] = [
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
