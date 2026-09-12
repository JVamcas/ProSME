import type { CollectionConfig } from "payload";

import { cmsEngagementAccess } from "@/payload/access/cms-resource-access";

export const NewsletterSubscriptions: CollectionConfig = {
  slug: "newsletter-subscriptions",
  dbName: "cms_newsletter_subscriptions",
  admin: { group: "Engagement", useAsTitle: "email", defaultColumns: ["email", "status", "createdAt"] },
  access: cmsEngagementAccess(),
  fields: [
    { name: "email", type: "email", required: true, unique: true, index: true },
    { name: "consent", type: "checkbox", required: true },
    { name: "status", type: "select", defaultValue: "subscribed", options: ["subscribed", "unsubscribed"], required: true },
    { name: "source", type: "text", defaultValue: "website" },
  ],
};
