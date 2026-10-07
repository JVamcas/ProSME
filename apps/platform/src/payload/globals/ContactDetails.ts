import type { Field, GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { homePublishingFields as contactPublishingFields } from "@/payload/fields/publishing";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";
import { pagePreviewUrl } from "@/payload/admin/preview-url";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const ContactDetails: GlobalConfig = {
  slug: "contact-details",
  label: "Contact Us",
  dbName: "cms_contact_details",
  admin: {
    group: "Site settings",
    preview: () => pagePreviewUrl({ slug: "contact" }),
    components: {
      elements: {
        SaveDraftButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveDraftButton",
        PublishButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsPublishButton",
      },
    },
  },
  access: cmsGlobalAccess(),
  hooks: {
    afterChange: [recordGlobalChange, revalidateGlobal],
    beforeChange: [globalPublishGuard({ approveOnPublish: true })],
  },
  versions: { drafts: true, max: 50 },
  fields: [
    {
      type: "group",
      label: "Contact details",
      admin: {
        components: {
          Field: "./modules/content/ui/admin/CmsContactDetailsGroupField.tsx",
        },
      },
      fields: ([
        {
          name: "email",
          label: "Email",
          type: "email",
          defaultValue: "info@smefund.na",
          required: true,
        },
        {
          name: "phone",
          label: "Telephone",
          type: "text",
          admin: {
            description:
              "Include the country code. Leave blank to hide the telephone card.",
          },
        },
        {
          name: "address",
          label: "Programme office address",
          type: "textarea",
          defaultValue:
            "Namibia Investment Promotion and Development Board, Windhoek, Namibia",
          required: true,
        },
        {
          name: "officeHours",
          label: "Office hours",
          type: "text",
          defaultValue: "Monday to Friday, 08:00–17:00",
        },
      ] satisfies Field[]).map(withAppFormInputs),
    },
    ...contactPublishingFields,
  ],
};
