import type { GlobalConfig } from "payload";

import { cmsGlobalAccess } from "@/payload/access/cms-resource-access";
import { recordGlobalChange } from "@/payload/hooks/record-content-audit";
import { revalidateGlobal } from "@/payload/hooks/revalidate-public-content";
import { publicPageVisibilitySchema } from "@/modules/content/domain/PublicPageVisibility";

export const PublicPageVisibility: GlobalConfig = {
  slug: "public-page-visibility",
  label: "Public Page Visibility",
  dbName: "cms_public_page_visibility",
  access: cmsGlobalAccess(),
  admin: {
    group: "Site settings",
    components: {
      views: {
        edit: {
          default: {
            Component:
              "./modules/content/ui/admin/CmsPublicPageVisibilityEditView.tsx",
          },
        },
      },
    },
  },
  // Visibility is operational configuration: switches save immediately.
  hooks: { afterChange: [recordGlobalChange, revalidateGlobal] },
  fields: [
    {
      name: "visibility",
      type: "json",
      defaultValue: {},
      required: true,
      validate: (value) => {
        const result = publicPageVisibilitySchema.safeParse(value);
        return result.success || result.error.issues[0].message;
      },
      admin: {
        components: {
          Field: "./modules/content/ui/admin/CmsPublicPageVisibilityField.tsx",
        },
      },
    },
  ],
};
