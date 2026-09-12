import type { GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const Header: GlobalConfig = {
  slug: "header",
  dbName: "cms_header",
  admin: { group: "Site settings" },
  access: cmsGlobalAccess(),
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [globalPublishGuard()] },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "announcement", type: "text", defaultValue: "An initiative under the ProSME Project" },
    {
      name: "navigation",
      type: "array",
      fields: [
        { name: "label", type: "text", required: true },
        { name: "href", type: "text", required: true },
      ],
    },
    { name: "signInLabel", type: "text", defaultValue: "Sign in", required: true },
    { name: "applyLabel", type: "text", defaultValue: "Apply Now", required: true },
    { name: "applyHref", type: "text", defaultValue: "/portal/applications/new", required: true },
    ...publishingFields,
  ],
};
