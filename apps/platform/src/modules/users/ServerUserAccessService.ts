import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import {
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { listAccessAudit } from "@/db/repositories/AuditRepository";
import {
  findAccessUser,
  inviteAccessUser,
  listAccessCapabilities,
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
    capabilities.userRead,
    capabilities.userManage,
    capabilities.roleRead,
    capabilities.roleManage,
  ]);
  const [users, roles, capabilityRows, audit] = await Promise.all([
    canReadUsers(user) ? listAccessUsers(input) : [],
    canReadRoles(user) ? listAccessRoles() : [],
    canReadRoles(user) ? listAccessCapabilities() : [],
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
  return Boolean(user?.capabilities.has(capabilities.userRead)) ||
    Boolean(user?.capabilities.has(capabilities.userManage));
}

function canReadRoles(user: AuthenticatedUser | null) {
  return Boolean(user?.capabilities.has(capabilities.roleRead)) ||
    Boolean(user?.capabilities.has(capabilities.roleManage));
}

function canReadAudit(user: AuthenticatedUser | null) {
  return Boolean(user?.capabilities.has(capabilities.auditRead));
}

export async function updateUserAccess(
  user: AuthenticatedUser | null,
  userId: string,
  input: UserAccessUpdateInput,
) {
  const actor = requireAnyPermission(user, [
    capabilities.userManage,
    capabilities.roleManage,
  ]);
  if (input.status) requirePermission(actor, capabilities.userManage);
  if (input.roleCodes) requirePermission(actor, capabilities.roleManage);
  await updateAccessUser(actor.id, userId, input);
  return findAccessUser(userId);
}

export async function promoteUser(
  user: AuthenticatedUser | null,
  userId: string,
  roleCodes: string[],
) {
  const actor = requirePermission(user, capabilities.userManage);
  requirePermission(actor, capabilities.roleManage);
  await promoteAccessUser(actor.id, userId, roleCodes);
  return findAccessUser(userId);
}

export async function inviteUser(
  user: AuthenticatedUser | null,
  input: UserInviteInput,
) {
  const actor = requirePermission(user, capabilities.userManage);
  requirePermission(actor, capabilities.roleManage);
  const id = await inviteAccessUser(actor.id, input);
  return findAccessUser(id);
}

export async function updateRole(
  user: AuthenticatedUser | null,
  roleId: string,
  input: RoleUpdateInput,
) {
  const actor = requirePermission(user, capabilities.roleManage);
  await updateAccessRole(actor.id, roleId, input);
  const roles = await listAccessRoles();
  return roles.find((role) => role.id === roleId) ?? null;
}

export async function getAuthorizationAudit(
  user: AuthenticatedUser | null,
  input: AuthorizationAuditListInput,
) {
  requirePermission(user, capabilities.auditRead);
  return listAccessAudit(input);
}
