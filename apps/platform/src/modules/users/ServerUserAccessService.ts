import "server-only";

import {
  permissionCatalogue,
  permissionCodes,
} from "@/auth/authorization/permissions";
import {
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { listAccessAudit } from "@/db/repositories/AuditRepository";
import {
  findAccessUser,
  inviteAccessUser,
  listAccessRoles,
  listAccessUsers,
  promoteAccessUser,
  updateAccessRole,
  updateAccessUser,
} from "@/db/repositories/UserAccessRepository";
import type {
  AuthorizationAuditListInput,
  RoleUpdateInput,
  UserAccessListInput,
  UserAccessUpdateInput,
  UserInviteInput,
  UserAccessView,
} from "./UserAccessTypes";

export async function getUserAccessView(
  user: AuthenticatedUser | null,
  input: UserAccessListInput,
  auditInput: AuthorizationAuditListInput,
): Promise<UserAccessView> {
  requireAnyPermission(user, [
    permissionCodes.userRead,
    permissionCodes.userManage,
    permissionCodes.roleRead,
    permissionCodes.roleManage,
  ]);
  const [users, roles, capabilityRows, audit] = await Promise.all([
    canReadUsers(user) ? listAccessUsers(input) : [],
    canReadRoles(user) ? listAccessRoles() : [],
    canReadRoles(user)
      ? permissionCatalogue.map(({ code, description }) => ({
          code,
          description,
        }))
      : [],
    canReadAudit(user) ? listAccessAudit(auditInput) : [],
  ]);
  return {
    audit,
    capabilities: capabilityRows,
    roles,
    users,
  };
}

function canReadUsers(user: AuthenticatedUser | null) {
  return Boolean(user?.capabilities.has(permissionCodes.userRead)) ||
    Boolean(user?.capabilities.has(permissionCodes.userManage));
}

function canReadRoles(user: AuthenticatedUser | null) {
  return Boolean(user?.capabilities.has(permissionCodes.roleRead)) ||
    Boolean(user?.capabilities.has(permissionCodes.roleManage));
}

function canReadAudit(user: AuthenticatedUser | null) {
  return Boolean(user?.capabilities.has(permissionCodes.auditRead));
}

export async function updateUserAccess(
  user: AuthenticatedUser | null,
  userId: string,
  input: UserAccessUpdateInput,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.userManage,
    permissionCodes.roleManage,
  ]);
  if (input.status) requirePermission(actor, permissionCodes.userManage);
  if (input.roleCodes) requirePermission(actor, permissionCodes.roleManage);
  await updateAccessUser(actor.id, userId, input);
  return findAccessUser(userId);
}

export async function promoteUser(
  user: AuthenticatedUser | null,
  userId: string,
  roleCodes: string[],
) {
  const actor = requirePermission(user, permissionCodes.userManage);
  requirePermission(actor, permissionCodes.roleManage);
  await promoteAccessUser(actor.id, userId, roleCodes);
  return findAccessUser(userId);
}

export async function inviteUser(
  user: AuthenticatedUser | null,
  input: UserInviteInput,
) {
  const actor = requirePermission(user, permissionCodes.userManage);
  requirePermission(actor, permissionCodes.roleManage);
  const id = await inviteAccessUser(actor.id, input);
  return findAccessUser(id);
}

export async function updateRole(
  user: AuthenticatedUser | null,
  roleId: string,
  input: RoleUpdateInput,
) {
  const actor = requirePermission(user, permissionCodes.roleManage);
  await updateAccessRole(actor.id, roleId, input);
  const roles = await listAccessRoles();
  return roles.find((role) => role.id === roleId) ?? null;
}

export async function getAuthorizationAudit(
  user: AuthenticatedUser | null,
  input: AuthorizationAuditListInput,
) {
  requirePermission(user, permissionCodes.auditRead);
  return listAccessAudit(input);
}
