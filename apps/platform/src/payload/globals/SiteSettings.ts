import type { GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  dbName: "cms_site_settings",
  admin: { group: "Site settings" },
  access: cmsGlobalAccess(),
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [globalPublishGuard()] },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "siteName", type: "text", defaultValue: "SME Fund Namibia", required: true },
    { name: "siteDescription", type: "textarea", defaultValue: "Funding and business development support for Namibian MSMEs.", required: true },
    { name: "analyticsMeasurementId", type: "text", admin: { description: "Optional GA4 measurement ID. Analytics loads only after consent." } },
    { name: "allowIndexing", type: "checkbox", defaultValue: true },
    { name: "defaultSocialImage", type: "upload", relationTo: "media" },
    ...publishingFields,
  ],
};
