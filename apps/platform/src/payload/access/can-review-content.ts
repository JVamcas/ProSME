import type { Access } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

export const canReviewContent: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.contentUpdate);
