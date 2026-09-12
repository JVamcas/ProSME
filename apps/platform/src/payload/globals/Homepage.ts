import type { GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { publishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";
import { homepagePreviewUrl } from "@/payload/admin/preview-url";
import { publicContentBlocks } from "@/payload/blocks/public-content";

export const Homepage: GlobalConfig = {
  slug: "homepage",
  dbName: "cms_homepage",
  admin: { group: "Site settings", preview: homepagePreviewUrl },
  access: cmsGlobalAccess(),
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal], beforeChange: [globalPublishGuard()] },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "eyebrow", type: "text", defaultValue: "Funding today. A stronger tomorrow." },
    { name: "title", type: "text", defaultValue: "Your business has potential. We help you take the next step." },
    { name: "summary", type: "textarea", defaultValue: "Funding and business development support for Namibian MSMEs ready to grow." },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "applyLabel", type: "text", defaultValue: "Apply Now", required: true },
    { name: "applyHref", type: "text", defaultValue: "/portal/applications/new", required: true },
    { name: "eligibilityLabel", type: "text", defaultValue: "Check My Eligibility", required: true },
    { name: "trackingLabel", type: "text", defaultValue: "Track Application", required: true },
    { name: "heroPanelHeading", type: "text", defaultValue: "Bigger businesses. A brighter Namibia." },
    { name: "heroPanelSummary", type: "textarea", defaultValue: "Open to eligible MSMEs from all 14 regions and every sector." },
    { name: "newsHeading", type: "text", defaultValue: "Latest news & resources" },
    { name: "layout", type: "blocks", blocks: publicContentBlocks },
    ...publishingFields,
  ],
};
