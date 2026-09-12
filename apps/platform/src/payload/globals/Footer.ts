import type { GlobalConfig } from "payload";

import { canAccessCms, readPublicContent } from "@/payload/access/can-access-cms";
import { enforceGlobalPublishCapability } from "@/payload/access/can-publish-content";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const Footer: GlobalConfig = {
  slug: "footer",
  dbName: "cms_footer",
  admin: { group: "Site settings" },
  access: { read: readPublicContent, update: canAccessCms },
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [enforceGlobalPublishCapability] },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "tagline", type: "text", defaultValue: "Funding today. A stronger tomorrow." },
    { name: "summary", type: "textarea", defaultValue: "Supporting Namibian MSMEs to grow, compete and create opportunities." },
    { name: "newsletterHeading", type: "text", defaultValue: "Stay in the loop" },
    { name: "newsletterSummary", type: "textarea", defaultValue: "Get funding-call updates and approved business resources." },
    { name: "copyright", type: "text", defaultValue: "© 2026 SME Fund Namibia. All rights reserved." },
    ...publishingFields,
  ],
};
