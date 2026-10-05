import type { Field } from "payload";

import { defaultHomeActionCards } from "@/modules/content/ContentDefaults";

function cardFields(
  card: "funding" | "eligibility" | "tracking",
  label: string,
  description: string,
): Field {
  return {
    type: "group",
    label,
    admin: { description },
    fields: [
      {
        name: `${card}Title`,
        label: "Title",
        type: "text",
        defaultValue: defaultHomeActionCards[`${card}Title`],
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormInput",
          },
        },
      },
      {
        name: `${card}Description`,
        label: "Description",
        type: "textarea",
        defaultValue: defaultHomeActionCards[`${card}Description`],
        admin: {
          components: {
            Field: "./modules/content/ui/admin/CmsFormFields.tsx#CmsFormTextarea",
          },
        },
      },
    ],
  };
}

export const homePageActionCardsFields: Field[] = [
  {
    name: "actionCards",
    type: "group",
    label: "Action cards",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsHomeActionsGroupField.tsx",
      },
    },
    fields: [
      cardFields(
        "funding",
        "Funding card",
        "The first card opens Funding Opportunities.",
      ),
      cardFields(
        "eligibility",
        "Eligibility card",
        "The second card opens Eligibility.",
      ),
      cardFields(
        "tracking",
        "Application tracking card",
        "The third card opens the applicant portal.",
      ),
    ],
  },
];
