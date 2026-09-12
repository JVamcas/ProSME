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

export const canManageCmsPrincipals = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsPrincipalsManage);

export const canReadCmsAudit: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsAuditRead);

export const canReadCmsAuditAdmin = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(req.user as CmsRequestUser, capabilities.cmsAuditRead);

export const readPublicContent: Access = () => true;
