import type { Access, CollectionConfig, GlobalConfig, PayloadRequest } from "payload";

import { cmsCapability, type CmsResource } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

function allows(resource: CmsResource, action: "read" | "create" | "update" | "delete"): Access {
  return ({ req }) => hasCmsCapability(req.user as CmsRequestUser, cmsCapability(resource, action));
}

function allowsAdmin(resource: CmsResource) {
  return ({ req }: { req: PayloadRequest }) =>
    hasCmsCapability(req.user as CmsRequestUser, cmsCapability(resource, "read"));
}

function publishedOrAllowed(resource: CmsResource): Access {
  return ({ req }) => hasCmsCapability(req.user as CmsRequestUser, cmsCapability(resource, "read"))
    ? true
    : { _status: { equals: "published" } };
}

export function cmsCollectionAccess(resource: CmsResource): CollectionConfig["access"] {
  return {
    admin: allowsAdmin(resource),
    create: allows(resource, "create"),
    delete: allows(resource, "delete"),
    read: publishedOrAllowed(resource),
    update: allows(resource, "update"),
  };
}

export function cmsMediaAccess(): CollectionConfig["access"] {
  return {
    admin: allowsAdmin("media"),
    create: allows("media", "create"),
    delete: allows("media", "delete"),
    read: () => true,
    update: allows("media", "update"),
  };
}

export function cmsEngagementAccess(): CollectionConfig["access"] {
  return {
    admin: allowsAdmin("engagement-submissions"),
    create: () => false,
    delete: allows("engagement-submissions", "delete"),
    read: allows("engagement-submissions", "read"),
    update: allows("engagement-submissions", "update"),
  };
}

export function cmsGlobalAccess(): GlobalConfig["access"] {
  return { read: () => true, update: allows("site-settings", "update") };
}
