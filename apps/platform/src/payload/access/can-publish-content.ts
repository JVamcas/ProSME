import type { CollectionBeforeChangeHook } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

export const enforcePublishCapability: CollectionBeforeChangeHook = ({ data, req }) => {
  const canPublish = hasCmsCapability(req.user as CmsRequestUser, capabilities.contentPublish);
  if (data?._status === "published" && !canPublish) {
    throw new Error("Publishing requires the content.publish capability");
  }
  return data;
};
