import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook, PayloadRequest } from "payload";

import { cmsCapability, type CmsResource } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

type WorkflowInput = {
  data: Record<string, unknown>;
  originalDoc?: Record<string, unknown>;
  req: PayloadRequest;
};

export function enforceCmsPublishing(resource: CmsResource, input: WorkflowInput) {
  const { data, originalDoc, req } = input;
  if (req.context?.skipPublishCapability === true) return data;
  const permission = cmsCapability(resource, "publish");
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

export function collectionPublishGuard(resource: CmsResource): CollectionBeforeChangeHook {
  return ({ data, originalDoc, req }) => enforceCmsPublishing(resource, { data, originalDoc, req });
}

export function globalPublishGuard(): GlobalBeforeChangeHook {
  return ({ data, originalDoc, req }) => enforceCmsPublishing("site-settings", { data, originalDoc, req });
}
