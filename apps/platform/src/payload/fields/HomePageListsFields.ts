import type { Field } from "payload";
import {
  defaultHomeProcess,
  defaultSupportGroups,
} from "@/modules/content/ContentDefaults";
import { publicContentBlocks } from "@/payload/blocks/public-content";
import { withAppFormInputs } from "./withAppFormInputs";

const cardListAdmin = {
  initCollapsed: false,
  components: {
    Field: "./modules/content/ui/admin/CmsCardListField.tsx#CmsCardListField",
    RowLabel:
      "./modules/content/ui/admin/CmsCardListField.tsx#CmsCardListRowLabel",
  },
};

export const homePageProcessFields: Field[] = [
  {
    name: "process",
    type: "group",
    label: "How it works",
    admin: {
      components: {
        Field:
          "./modules/content/ui/admin/CmsHomeListsGroupField.tsx#CmsHomeProcessGroupField",
      },
    },
    fields: (
      [
        {
          name: "heading",
          type: "text",
          defaultValue: defaultHomeProcess.heading,
        },
        {
          name: "introduction",
          type: "textarea",
          defaultValue: defaultHomeProcess.introduction,
        },
        {
          name: "steps",
          type: "array",
          labels: { singular: "Step", plural: "Steps" },
          defaultValue: defaultHomeProcess.steps,
          admin: {
            ...cardListAdmin,
            description: "Add, remove or drag steps to change their order.",
          },
          fields: [
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ] satisfies Field[]
    ).map(withAppFormInputs),
  },
];

export const homePageSupportFields: Field[] = [
  {
    type: "group",
    label: "Who we support",
    admin: {
      components: {
        Field:
          "./modules/content/ui/admin/CmsHomeListsGroupField.tsx#CmsHomeSupportGroupField",
      },
    },
    fields: (
      [
        {
          name: "supportHeading",
          label: "Heading",
          type: "text",
          defaultValue: "Who we support",
        },
        {
          name: "supportIntroduction",
          label: "Introduction",
          type: "textarea",
          defaultValue:
            "The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:",
        },
        {
          name: "supportCards",
          label: "Support cards",
          type: "array",
          labels: { singular: "Card", plural: "Cards" },
          defaultValue: defaultSupportGroups,
          admin: {
            ...cardListAdmin,
            description:
              "These are the scrolling cards on Home. Add, remove or drag cards to change their order.",
          },
          fields: [
            { name: "label", label: "Title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ] satisfies Field[]
    ).map(withAppFormInputs),
  },
];

export const homePageAdditionalFields: Field[] = [
  {
    type: "group",
    label: "Additional Content",
    admin: {
      components: {
        Field:
          "./modules/content/ui/admin/CmsHomeListsGroupField.tsx#CmsHomeAdditionalGroupField",
      },
    },
    fields: (
      [
        {
          name: "fundingSlogan",
          type: "text",
          defaultValue: "Brighter businesses. A stronger Namibia.",
          admin: { hidden: true },
        },
        {
          name: "newsIntroduction",
          type: "textarea",
          defaultValue:
            "Updates, stories and useful materials for Namibian entrepreneurs.",
          admin: { hidden: true },
        },
        {
          name: "layout",
          label: "Impact banner",
          type: "blocks",
          blocks: publicContentBlocks,
          admin: {
            components: {
              Field:
                "./modules/content/ui/admin/CmsHomeImpactField.tsx#CmsHomeImpactField",
            },
          },
        },
      ] satisfies Field[]
    ).map(withAppFormInputs),
  },
];
