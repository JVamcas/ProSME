import type {
  CollectionBeforeChangeHook,
  GlobalBeforeChangeHook,
  PayloadRequest,
} from "payload";

import {
  cmsPermissionCode,
  type CmsPermissionResource,
} from "@/auth/authorization/permissions";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

type WorkflowInput = {
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
  req: PayloadRequest;
};

export function enforceCmsPublishing(
  resource: CmsPermissionResource,
  input: WorkflowInput,
) {
  const { data, originalDoc, req } = input;
  if (req.context?.skipPublishCapability === true) return data;
  const permission = cmsPermissionCode(resource, "publish");
  const canPublish = hasCmsCapability(req.user as CmsRequestUser, permission);
  if (data._status === "published" && !canPublish) {
    throw new Error(`Publishing requires the ${permission} capability`);
  }
  if (!canPublish && data.reviewStatus === "approved") {
    if (originalDoc?.reviewStatus !== "approved") {
      throw new Error(`Approval requires the ${permission} capability`);
    }
    data.reviewStatus = "inReview";
    data._status = "draft";
  }
  if (data._status === "published" && data.reviewStatus !== "approved") {
    throw new Error("Content must be approved before it can be published");
  }
  return data;
}

export function collectionPublishGuard(
  resource: CmsPermissionResource,
): CollectionBeforeChangeHook {
  return ({ data, originalDoc, req }) =>
    enforceCmsPublishing(resource, { data, originalDoc, req });
}

export function globalPublishGuard(): GlobalBeforeChangeHook {
  return ({ data, originalDoc, req }) =>
    enforceCmsPublishing("site-settings", { data, originalDoc, req });
}
