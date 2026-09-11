import type { Access, PayloadRequest } from "payload";

import { capabilities } from "@/auth/authorization/capabilities";

export type CmsRequestUser = {
  capabilities?: string[];
} | null;

export function hasCmsCapability(user: CmsRequestUser, capability: string) {
  return user?.capabilities?.includes(capability) ?? false;
}

export const canAccessCms: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsAccess);

export const canAccessCmsAdmin = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsAccess);

export const readPublicContent: Access = () => true;

export const readPublishedOrCms: Access = ({ req }) => {
  if (hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsAccess)) return true;
  return { _status: { equals: "published" } };
};
