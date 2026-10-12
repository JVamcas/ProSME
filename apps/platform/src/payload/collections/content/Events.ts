import type { CollectionConfig } from "payload";

import { prepareEvent } from "@/modules/content/EventPublishing";
import { collectionPublishGuard } from "@/payload/access/can-publish-content";
import { cmsCollectionAccess } from "@/payload/access/cms-resource-access";
import { eventContentFields } from "@/payload/fields/EventContentFields";
import { withAppFormInputs } from "@/payload/fields/withAppFormInputs";
import {
  recordCollectionChange,
  recordCollectionDelete,
} from "@/payload/hooks/record-content-audit";
import {
  revalidateCollection,
  revalidateCollectionDelete,
} from "@/payload/hooks/revalidate-public-content";
import { eventPreviewUrl } from "@/modules/content/EventPreviewUrl";

export const Events: CollectionConfig = {
  slug: "events",
  dbName: "cms_events",
  admin: {
    group: "Content",
    useAsTitle: "title",
    defaultColumns: ["title", "startsAt", "_status"],
    preview: eventPreviewUrl,
    components: {
      views: {
        edit: {
          default: {
            Component: "./modules/content/ui/admin/CmsEventEditView.tsx",
          },
        },
      },
      edit: {
        SaveDraftButton:
          "./modules/content/ui/admin/CmsDocumentButtons.tsx#CmsSaveDraftButton",
        PublishButton: "./modules/content/ui/admin/CmsEventPublishButton.tsx",
      },
    },
  },
  access: cmsCollectionAccess("events"),
  hooks: {
    beforeValidate: [prepareEvent],
    afterChange: [recordCollectionChange, revalidateCollection],
    afterDelete: [recordCollectionDelete, revalidateCollectionDelete],
    beforeChange: [
      collectionPublishGuard("events", { approveOnPublish: true }),
    ],
  },
  versions: { drafts: true, maxPerDoc: 50 },
  fields: eventContentFields.map(withAppFormInputs),
};
