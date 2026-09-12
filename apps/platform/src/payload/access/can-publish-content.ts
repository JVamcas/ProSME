import type { CollectionBeforeChangeHook, GlobalBeforeChangeHook } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

function enforceWorkflow(data: Record<string, unknown>, originalDoc: Record<string, unknown> | undefined, req: Parameters<CollectionBeforeChangeHook>[0]["req"]) {
  if (req.context?.skipPublishCapability === true) return data;
  const canPublish = hasCmsCapability(req.user as CmsRequestUser, capabilities.contentPublish);
  if (data._status === "published" && !canPublish) {
    throw new Error("Publishing requires the content.publish capability");
  }
  if (!canPublish && data.reviewStatus === "approved") {
    if (originalDoc?.reviewStatus !== "approved") throw new Error("Approval requires the content.publish capability");
    data.reviewStatus = "inReview";
    data._status = "draft";
  }
  if (data._status === "published" && data.reviewStatus !== "approved") {
    throw new Error("Content must be approved before it can be published");
  }
  return data;
}

export const enforcePublishCapability: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  return enforceWorkflow(data, originalDoc, req);
};

export const enforceGlobalPublishCapability: GlobalBeforeChangeHook = ({ data, originalDoc, req }) => {
  return enforceWorkflow(data, originalDoc, req);
};
