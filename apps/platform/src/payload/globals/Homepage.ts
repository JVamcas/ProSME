import type { GlobalConfig } from "payload";

import { globalPublishGuard } from "@/payload/access/can-publish-content";
import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { homePublishingFields } from "@/payload/fields/publishing";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";
import { homepagePreviewUrl } from "@/payload/admin/preview-url";
import { homePageBannerFields } from "@/payload/fields/HomePageBannerFields";
import {
  homePageProcessFields,
  homePageSupportFields,
  homePageAdditionalFields,
} from "@/payload/fields/HomePageListsFields";
import { homePageActionCardsFields } from "@/payload/fields/HomePageActionCardsFields";

export const Homepage: GlobalConfig = {
  slug: "homepage",
  dbName: "cms_homepage",
  admin: {
    group: "Site settings",
    preview: homepagePreviewUrl,
    components: {
      views: {
        edit: {
          default: {
            Component: "./modules/content/ui/admin/CmsHomeSectionEditView.tsx",
          },
        },
      },
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
    beforeChange: [globalPublishGuard()],
  },
  versions: { drafts: true, max: 50 },
  fields: [
    ...homePageBannerFields,
    ...homePageActionCardsFields,
    {
      type: "group",
      label: "Additional Home sections",
      admin: { hidden: true },
      fields: [
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
        {
          name: "newsHeading",
          type: "text",
          defaultValue: "Latest news & resources",
          admin: { hidden: true },
        },
      ],
    },
    ...homePageProcessFields,
    ...homePageSupportFields,
    ...homePageAdditionalFields,
    ...homePublishingFields,
  ],
};
