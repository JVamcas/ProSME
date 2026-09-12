import type { GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const ContactDetails: GlobalConfig = {
  slug: "contact-details",
  dbName: "cms_contact_details",
  admin: { group: "Site settings" },
  access: cmsGlobalAccess(),
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [globalPublishGuard()] },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "email", type: "email", defaultValue: "info@smefund.na", required: true },
    { name: "address", type: "textarea", defaultValue: "Namibia Investment Promotion and Development Board, Windhoek, Namibia", required: true },
    { name: "phone", type: "text" },
    { name: "officeHours", type: "text", defaultValue: "Monday to Friday, 08:00–17:00" },
    ...publishingFields,
  ],
};
