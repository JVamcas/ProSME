import type { GlobalConfig } from "payload";

import { canAccessCms, readPublicContent } from "@/payload/access/can-access-cms";
import { enforceGlobalPublishCapability } from "@/payload/access/can-publish-content";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";

export const Header: GlobalConfig = {
  slug: "header",
  dbName: "cms_header",
  admin: { group: "Site settings" },
  access: { read: readPublicContent, update: canAccessCms },
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [enforceGlobalPublishCapability] },
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
