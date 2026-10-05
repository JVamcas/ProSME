import type { Field } from "payload";
import { withAppFormInputs } from "./withAppFormInputs";

// Unnamed groups organise the editor without changing saved field paths.
const bannerFields: Field[] = [
  {
    type: "group",
    label: "Main message",
    fields: [
      {
        name: "eyebrow",
        label: "Small opening line",
        type: "text",
        defaultValue: "Funding today. A stronger tomorrow.",
        admin: { description: "The small line above the main headline." },
      },
      {
        name: "title",
        label: "Headline",
        type: "text",
        defaultValue:
          "Your business has potential. We help you take the next step.",
        admin: { description: "The large heading at the top of Home." },
      },
      {
        name: "summary",
        label: "Introductory paragraph",
        type: "textarea",
        defaultValue:
          "Funding and business development support for Namibian MSMEs ready to grow.",
        admin: { description: "The paragraph beneath the headline." },
      },
    ],
  },
  {
    type: "group",
    label: "Image and overlay",
    admin: {
      description:
        "The same image is used on desktop and mobile. Preview both sizes before publishing.",
    },
    fields: [
      {
        name: "heroImage",
        label: "Main image",
        type: "upload",
        relationTo: "media",
        admin: {
          description:
            "Choose or upload an image. Edit its Alt field in the media record to describe it for visitors using screen readers.",
        },
      },
      {
        name: "heroPanelHeading",
        label: "Campaign slogan",
        type: "text",
        defaultValue: "Bigger businesses. A brighter Namibia.",
        admin: {
          description:
            "The script-style message over the image on desktop and mobile.",
        },
      },
      {
        name: "heroPanelSummary",
        label: "Quote",
        type: "textarea",
        defaultValue:
          "Open to eligible MSMEs from all 14 regions and every sector.",
        admin: {
          description:
            "The message in the white quote card on desktop. The attribution is SME Fund Namibia.",
        },
      },
    ],
  },
  {
    type: "group",
    label: "Buttons",
    fields: [
      {
        name: "applyLabel",
        label: "Apply button label",
        type: "text",
        defaultValue: "Apply Now",
        required: true,
        admin: {
          description:
            "Opens the application journey. Its destination is fixed.",
        },
      },
      {
        name: "fundingButtonLabel",
        label: "Funding opportunities button label",
        type: "text",
        defaultValue: "Funding Opportunities",
        admin: {
          description: "Opens Funding Opportunities. Its destination is fixed.",
        },
      },
    ],
  },
  {
    type: "group",
    label: "Benefits",
    admin: {
      description:
        "The three short captions below the buttons, from left to right.",
    },
    fields: [
      {
        name: "benefitFunding",
        label: "Funding benefit",
        type: "text",
        defaultValue: "Access funding",
      },
      {
        name: "benefitCapacity",
        label: "Capacity benefit",
        type: "text",
        defaultValue: "Build your capacity",
      },
      {
        name: "benefitOpportunity",
        label: "Opportunity benefit",
        type: "text",
        defaultValue: "Create opportunities",
      },
    ],
  },
];

export const homePageBannerFields: Field[] = [
  {
    type: "group",
    label: "Home Page Banner",
    admin: {
      components: {
        Field: "./modules/content/ui/admin/CmsHomeBannerGroupField.tsx",
      },
    },
    fields: bannerFields.map(withAppFormInputs),
  },
];
