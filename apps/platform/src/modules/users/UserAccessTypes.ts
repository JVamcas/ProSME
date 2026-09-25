import type { z } from "zod";

import type {
  authorizationAuditListSchema,
  inviteUserSchema,
  listUsersSchema,
  updateRoleSchema,
  updateUserSchema,
} from "./UserAccessSchemas";

export const provisionedUserStatuses = [
  "invited",
  "active",
  "suspended",
  "disabled",
] as const;

export const userStatuses = [
  ...provisionedUserStatuses,
  "unprovisioned",
] as const;

export type UserStatus = (typeof userStatuses)[number];
export type UserAccessListInput = z.infer<typeof listUsersSchema>;
export type UserAccessUpdateInput = z.infer<typeof updateUserSchema>;
export type UserInviteInput = z.infer<typeof inviteUserSchema>;
export type RoleUpdateInput = z.infer<typeof updateRoleSchema>;
export type AuthorizationAuditListInput = z.infer<
  typeof authorizationAuditListSchema
>;

export type UserAccessRow = {
  capabilityCodes: string[];
  displayName: string;
  email: string;
  emailVerified: boolean;
  id: string;
  lastLoginAt: string | null;
  roleCodes: string[];
  status: UserStatus;
  userType: "applicant" | "staff" | null;
};

export type RoleAccessRow = {
  assignedUserCount: number;
  capabilityCodes: string[];
  code: string;
  description: string | null;
  id: string;
  name: string;
};

export type CapabilityRow = {
  code: string;
  description: string | null;
};

export type AuthorizationAuditRow = {
  action: string;
  actorId: string;
  createdAt: string;
  id: string;
  roleCode: string | null;
  targetRoleCode: string | null;
  targetUserEmail: string | null;
};

export type UserAccessView = {
  audit: AuthorizationAuditRow[];
  capabilities: CapabilityRow[];
  roles: RoleAccessRow[];
  users: UserAccessRow[];
  usersPage: {
    limit: number;
    page: number;
    total: number;
  };
};
