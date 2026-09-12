import type { CollectionConfig } from "payload";

import { canManageCmsPrincipals } from "@/payload/access/can-access-cms";
import { firebaseSessionStrategy } from "@/payload/auth/firebase-session-strategy";

export const CmsPrincipals: CollectionConfig = {
  slug: "cms-principals",
  dbName: "cms_principals",
  auth: {
    disableLocalStrategy: true,
    strategies: [firebaseSessionStrategy],
  },
  admin: {
    group: "Administration",
    useAsTitle: "email",
    description: "CMS access mirrors. Credentials and permissions are managed outside Payload.",
  },
  access: {
    admin: canManageCmsPrincipals,
    create: () => false,
    delete: () => false,
    read: canManageCmsPrincipals,
    update: () => false,
  },
  fields: [
    {
      name: "email",
      type: "email",
      required: true,
      unique: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: "applicationUserId",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: { description: "Immutable app_users.id reference." },
    },
    { name: "displayName", type: "text", required: true },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "active",
      options: ["active", "disabled"],
    },
  ],
};
