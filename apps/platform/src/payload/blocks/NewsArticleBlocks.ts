import { FixedToolbarFeature, lexicalEditor } from "@payloadcms/richtext-lexical";
import type { Block, Field } from "payload";

import { validateArticleLink } from "@/modules/content/domain/ArticleLink";
import { withAppFormInputs } from "../fields/withAppFormInputs";

function textContent(name: string, label: string): Field {
  return {
    name,
    label,
    type: "richText",
    required: true,
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => [
        ...defaultFeatures,
        FixedToolbarFeature(),
      ],
    }),
  };
}

const imageFields: Field[] = [
  {
    name: "image",
    type: "upload",
    relationTo: "media",
    required: true,
    filterOptions: { mimeType: { contains: "image/" } },
  },
  {
    name: "alt",
    label: "Alternative text",
    type: "text",
    admin: {
      description:
        "Describe the image. Leave empty to use the media's alternative text.",
    },
  },
  { name: "caption", type: "text" },
];

const buttonFields: Field[] = [
  { name: "label", label: "Button text", type: "text", required: true },
  {
    name: "href",
    label: "Button link",
    type: "text",
    required: true,
    validate: validateArticleLink,
  },
];

const blocks: Block[] = [
  {
    slug: "articleTextImage",
    labels: { singular: "Text beside image", plural: "Text beside image sections" },
    fields: [
      { name: "heading", type: "text" },
      textContent("content", "Text"),
      ...imageFields,
      {
        name: "imagePosition",
        label: "Image position",
        type: "select",
        required: true,
        defaultValue: "right",
        options: [
          { label: "Image on the left", value: "left" },
          { label: "Image on the right", value: "right" },
        ],
      },
      {
        name: "button",
        label: "Optional button",
        type: "group",
        fields: buttonFields.map((field) => (
          { ...field, required: false } as Field
        )),
        validate: (value) => {
          if (!value || typeof value !== "object") return true;
          const button = value as { label?: string; href?: string };
          return Boolean(button.label?.trim()) === Boolean(button.href?.trim())
            ? true
            : "Enter both button text and link, or leave both empty.";
        },
      },
    ],
  },
  {
    slug: "articleColumns",
    labels: { singular: "Two-column text", plural: "Two-column text sections" },
    fields: [
      textContent("left", "Left column"),
      textContent("right", "Right column"),
    ],
  },
  {
    slug: "articleImage",
    labels: { singular: "Full-width image", plural: "Full-width images" },
    fields: imageFields,
  },
  {
    slug: "articleButton",
    labels: { singular: "Button", plural: "Buttons" },
    fields: buttonFields,
  },
];

export const newsArticleBlocks = blocks.map((block) => ({
  ...block,
  fields: block.fields.map(withAppFormInputs),
}));
