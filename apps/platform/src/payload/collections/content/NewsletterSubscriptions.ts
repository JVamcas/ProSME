import type { CollectionConfig } from "payload";

import { canAccessCms } from "@/payload/access/can-access-cms";

export const NewsletterSubscriptions: CollectionConfig = {
  slug: "newsletter-subscriptions",
  dbName: "cms_newsletter_subscriptions",
  admin: { group: "Engagement", useAsTitle: "email", defaultColumns: ["email", "status", "createdAt"] },
  access: { create: () => false, delete: canAccessCms, read: canAccessCms, update: canAccessCms },
  fields: [
    { name: "email", type: "email", required: true, unique: true, index: true },
    { name: "consent", type: "checkbox", required: true },
    { name: "status", type: "select", defaultValue: "subscribed", options: ["subscribed", "unsubscribed"], required: true },
    { name: "source", type: "text", defaultValue: "website" },
  ],
};
