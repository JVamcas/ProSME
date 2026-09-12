import type { CollectionConfig } from "payload";

import { cmsEngagementAccess } from "@/payload/access/cms-resource-access";

export const ContactSubmissions: CollectionConfig = {
  slug: "contact-submissions",
  dbName: "cms_contact_submissions",
  admin: { group: "Engagement", useAsTitle: "email", defaultColumns: ["name", "email", "subject", "createdAt"] },
  access: cmsEngagementAccess(),
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true, index: true },
    { name: "phone", type: "text" },
    { name: "subject", type: "text", required: true },
    { name: "message", type: "textarea", required: true },
    { name: "consent", type: "checkbox", required: true },
    { name: "status", type: "select", defaultValue: "new", options: ["new", "inProgress", "resolved"], required: true },
  ],
};
