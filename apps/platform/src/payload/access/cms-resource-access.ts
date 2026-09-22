import type {
  Access,
  CollectionConfig,
  GlobalConfig,
  PayloadRequest,
} from "payload";

import {
  cmsPermissionCode,
  type CmsPermissionResource,
} from "@/auth/authorization/permissions";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

function allows(
  resource: CmsPermissionResource,
  action: "read" | "create" | "update" | "delete",
): Access {
  return ({ req }) =>
    hasCmsCapability(
      req.user as CmsRequestUser,
      cmsPermissionCode(resource, action),
    );
}

function allowsAdmin(resource: CmsPermissionResource) {
  return ({ req }: { req: PayloadRequest }) =>
    hasCmsCapability(
      req.user as CmsRequestUser,
      cmsPermissionCode(resource, "read"),
    );
}

function publishedOrAllowed(resource: CmsPermissionResource): Access {
  return ({ req }) =>
    hasCmsCapability(
      req.user as CmsRequestUser,
      cmsPermissionCode(resource, "read"),
    )
      ? true
      : { _status: { equals: "published" } };
}

export function cmsCollectionAccess(
  resource: CmsPermissionResource,
): CollectionConfig["access"] {
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
