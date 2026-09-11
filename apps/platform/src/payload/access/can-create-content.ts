import type { Access } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";
import { hasCmsCapability, type CmsRequestUser } from "./can-access-cms";

export const canCreateContent: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.contentCreate);

export const canUpdateContent: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.contentUpdate);

export const canDeleteContent: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.contentDelete);
