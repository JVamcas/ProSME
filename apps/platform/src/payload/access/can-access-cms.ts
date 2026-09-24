import type { Access, PayloadRequest } from "payload";

import { permissionCodes } from "@/auth/authorization/permissions";

export type CmsRequestUser = {
  capabilities?: string[];
} | null;

export function hasCmsCapability(user: CmsRequestUser, capability: string) {
  return user?.capabilities?.includes(capability) ?? false;
}

export const canAccessCms: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, permissionCodes.cmsAccess);

export const canAccessCmsAdmin = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(req.user as CmsRequestUser, permissionCodes.cmsAccess);

export const canManageCmsPrincipals = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(
    req.user as CmsRequestUser,
    permissionCodes.cmsPrincipalsManage,
  );

export const canReadCmsAudit: Access = ({ req }) =>
  hasCmsCapability(req.user as CmsRequestUser, permissionCodes.cmsAuditRead);

export const canReadCmsAuditAdmin = ({ req }: { req: PayloadRequest }) =>
  hasCmsCapability(req.user as CmsRequestUser, permissionCodes.cmsAuditRead);

export const readPublicContent: Access = () => true;
