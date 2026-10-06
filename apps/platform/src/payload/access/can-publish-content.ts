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

type PublishingOptions = {
  approveOnPublish?: boolean;
};

export function enforceCmsPublishing(
  resource: CmsPermissionResource,
  input: WorkflowInput,
  options: PublishingOptions = {},
) {
  const { data, originalDoc, req } = input;
  if (req.context?.skipPublishCapability === true) return data;
  const permission = cmsPermissionCode(resource, "publish");
  const canPublish = hasCmsCapability(req.user as CmsRequestUser, permission);
  if (data._status === "published" && !canPublish) {
    throw new Error(`Publishing requires the ${permission} capability`);
  }
  if (data._status === "published" && options.approveOnPublish) {
    data.reviewStatus = "approved";
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
  options: PublishingOptions | ((input: WorkflowInput) => PublishingOptions) = {},
): CollectionBeforeChangeHook {
  return ({ data, originalDoc, req }) => {
    const input = { data, originalDoc, req };
    const publishingOptions =
      typeof options === "function" ? options(input) : options;
    return enforceCmsPublishing(resource, input, publishingOptions);
  };
}

export function globalPublishGuard(
  options: PublishingOptions = {},
): GlobalBeforeChangeHook {
  return ({ data, originalDoc, req }) =>
    enforceCmsPublishing("site-settings", { data, originalDoc, req }, options);
}
