"use client";

import { requestData } from "@/lib/client-http";
import type {
  AuthorizationAuditListInput,
  UserAccessListInput,
} from "./UserAccessTypes";
import type {
  InviteUserInput,
  PromoteUserInput,
  UpdateRoleInput,
  UpdateUserInput,
} from "./UserAccessTransportTypes";
import type {
  AuthorizationAuditRow,
  RoleAccessRow,
  UserAccessRow,
  UserAccessView,
} from "./UserAccessTypes";

const jsonHeaders = { "Content-Type": "application/json" };

function queryString(input: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

function listAccess(input: UserAccessListInput & AuthorizationAuditListInput) {
  return requestData<UserAccessView>(
    `/api/admin/users${queryString(input)}`,
    { cache: "no-store" },
  );
}

function updateUser(userId: string, input: UpdateUserInput) {
  return requestData<UserAccessRow | null>(`/api/admin/users/${userId}`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
}

function provisionUser(directoryId: string) {
  return requestData<UserAccessRow | null>(
    `/api/admin/users/${encodeURIComponent(directoryId)}/provision`,
    { method: "POST" },
  );
}

function promoteUser(userId: string, input: PromoteUserInput) {
  return requestData<UserAccessRow | null>(
    `/api/admin/users/${userId}/promote`,
    {
      body: JSON.stringify(input),
      headers: jsonHeaders,
      method: "POST",
    },
  );
}

function inviteUser(input: InviteUserInput) {
  return requestData<UserAccessRow | null>("/api/admin/users", {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "POST",
  });
}

function updateRole(roleId: string, input: UpdateRoleInput) {
  return requestData<RoleAccessRow | null>(`/api/admin/roles/${roleId}`, {
    body: JSON.stringify(input),
    headers: jsonHeaders,
    method: "PATCH",
  });
}

function listAudit(input: AuthorizationAuditListInput) {
  return requestData<AuthorizationAuditRow[]>(
    `/api/admin/audit-log${queryString(input)}`,
    { cache: "no-store" },
  );
}

export const clientUserAccessService = {
  inviteUser,
  listAccess,
  listAudit,
  promoteUser,
  provisionUser,
  updateRole,
  updateUser,
};
