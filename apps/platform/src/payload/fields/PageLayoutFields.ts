import type { Field } from "payload";

import { defaultPages } from "@/modules/content/ContentDefaults";
import { pageContentBlocks } from "@/payload/blocks/public-content";
import { withAppFormInputs } from "./withAppFormInputs";

export const pageLayoutFields: Field[] = [
  {
    type: "group",
    label: "Page sections",
    admin: {
      condition: (data) => data.slug !== "about" && data.slug !== "how-to-apply" && data.slug !== "faq",
      components: {
        Field: "./modules/content/ui/admin/CmsFundingOverviewGroupField.tsx",
      },
    },
    fields: [
      withAppFormInputs({
        name: "layout",
        label: "Sections",
        type: "blocks",
        blocks: pageContentBlocks.map((block) => {
          if (!["fundingSupport", "fundingPriorities", "eligibilityFocusSectors"].includes(block.slug)) {
            return block;
          }
          return {
            ...block,
            fields: block.fields.map((field): Field => {
              if ("name" in field && field.name === "eyebrow") {
                return { ...field, label: "Heading" };
              }
              if ("name" in field && field.name === "heading") {
                return { ...field, label: "Introduction" };
              }
              if (field.type !== "array") return field;
              return {
                ...field,
                admin: {
                  ...field.admin,
                  initCollapsed: false,
                  components: {
                    Field: "./modules/content/ui/admin/CmsCardListField.tsx#CmsCardListField",
                    RowLabel: "./modules/content/ui/admin/CmsCardListField.tsx#CmsCardListRowLabel",
                  },
                },
              };
            }),
          };
        }),
        defaultValue: ({ req }) => {
          const slug = req.query?.cmsPage;
          return slug === "funding" || slug === "eligibility"
            ? defaultPages[slug].blocks
            : undefined;
        },
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsFundingOverviewBlocksField.tsx",
          },
        },
      }),
    ],
  },
];
