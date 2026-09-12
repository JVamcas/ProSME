import type { CollectionConfig } from "payload";

import { canAccessCms } from "@/payload/access/can-access-cms";

export const ContentAuditEntries: CollectionConfig = {
  slug: "content-audit-entries",
  dbName: "cms_content_audit_entries",
  admin: { group: "Administration", useAsTitle: "action", defaultColumns: ["collection", "action", "actorEmail", "createdAt"] },
  access: { create: () => false, delete: () => false, read: canAccessCms, update: () => false },
  fields: [
    { name: "collection", type: "text", required: true, index: true },
    { name: "documentId", type: "text", required: true, index: true },
    { name: "action", type: "text", required: true },
    { name: "actorId", type: "text", required: true },
    { name: "actorEmail", type: "email", required: true },
  ],
};
