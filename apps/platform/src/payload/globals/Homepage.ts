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
  admin: {
    group: "Site settings",
    preview: homepagePreviewUrl,
  },
  access: cmsGlobalAccess(),
  hooks: {
    afterChange: [recordGlobalChange, revalidateGlobal],
    beforeChange: [globalPublishGuard()],
  },
  versions: { drafts: true, max: 50 },
  fields: [
    { name: "eyebrow", type: "text", defaultValue: "Funding today. A stronger tomorrow." },
    {
      name: "title",
      type: "text",
      defaultValue: "Your business has potential. We help you take the next step.",
    },
    {
      name: "summary",
      type: "textarea",
      defaultValue: "Funding and business development support for Namibian MSMEs ready to grow.",
    },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "applyLabel", type: "text", defaultValue: "Apply Now", required: true },
    {
      name: "applyHref",
      type: "text",
      defaultValue: "/portal/applications/new",
      required: true,
      admin: { hidden: true },
    },
    {
      name: "eligibilityLabel",
      type: "text",
      defaultValue: "Check My Eligibility",
      required: true,
      admin: { hidden: true },
    },
    {
      name: "trackingLabel",
      type: "text",
      defaultValue: "Track Application",
      required: true,
      admin: { hidden: true },
    },
    { name: "heroPanelHeading", type: "text", defaultValue: "Bigger businesses. A brighter Namibia." },
    {
      name: "heroPanelSummary",
      type: "textarea",
      defaultValue: "Open to eligible MSMEs from all 14 regions and every sector.",
    },
    { name: "fundingButtonLabel", type: "text", defaultValue: "Funding Opportunities" },
    { name: "benefitFunding", type: "text", defaultValue: "Access funding" },
    { name: "benefitCapacity", type: "text", defaultValue: "Build your capacity" },
    { name: "benefitOpportunity", type: "text", defaultValue: "Create opportunities" },
    {
      name: "actionCards",
      type: "group",
      fields: [
        { name: "fundingTitle", type: "text", defaultValue: "I want funding" },
        {
          name: "fundingDescription",
          type: "textarea",
          defaultValue: "Explore current opportunities and find the right funding for your business.",
        },
        { name: "eligibilityTitle", type: "text", defaultValue: "Am I eligible?" },
        {
          name: "eligibilityDescription",
          type: "textarea",
          defaultValue: "Check if your business meets the key criteria before you apply.",
        },
        { name: "trackingTitle", type: "text", defaultValue: "I already applied" },
        {
          name: "trackingDescription",
          type: "textarea",
          defaultValue: "Track your application and stay updated on the next steps.",
        },
      ],
    },
    {
      name: "process",
      type: "group",
      fields: [
        { name: "heading", type: "text", defaultValue: "How it works" },
        {
          name: "introduction",
          type: "textarea",
          defaultValue: "A simple, transparent process to get you from application to support.",
        },
        {
          name: "steps",
          type: "array",
          minRows: 4,
          maxRows: 4,
          fields: [
            { name: "title", type: "text", required: true },
            { name: "description", type: "textarea", required: true },
          ],
        },
      ],
    },
    { name: "supportHeading", type: "text", defaultValue: "Who we support" },
    {
      name: "supportIntroduction",
      type: "textarea",
      defaultValue: "The SME Fund is open to any Namibian MSME with high potential, inclusive impact and a commitment to growth. Our priority areas include:",
    },
    {
      name: "fundingSlogan",
      type: "text",
      defaultValue: "Brighter businesses. A stronger Namibia.",
    },
    {
      name: "newsHeading",
      type: "text",
      defaultValue: "Latest news & resources",
      admin: { hidden: true },
    },
    {
      name: "newsIntroduction",
      type: "textarea",
      defaultValue: "Updates, stories and useful materials for Namibian entrepreneurs.",
    },
    { name: "layout", type: "blocks", blocks: publicContentBlocks },
    ...publishingFields,
  ],
};
