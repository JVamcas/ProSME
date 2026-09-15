import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/AuditRepository", () => ({
  listAccessAudit: vi.fn(),
}));
vi.mock("@/db/repositories/UserAccessRepository", () => ({
  findAccessUser: vi.fn(),
  inviteAccessUser: vi.fn(),
  listAccessCapabilities: vi.fn(),
  listAccessRoles: vi.fn(),
  listAccessUsers: vi.fn(),
  promoteAccessUser: vi.fn(),
  updateAccessRole: vi.fn(),
  updateAccessUser: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
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
import {
  getAuthorizationAudit,
  getUserAccessView,
  inviteUser,
  promoteUser,
  updateRole,
  updateUserAccess,
} from "@/modules/users/ServerUserAccessService";

const actor: AuthenticatedUser = {
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  capabilities: new Set(),
  createdAt: new Date(),
  displayName: "System Administrator",
  email: "admin@example.test",
  identitySubject: "firebase-admin",
  lastLoginAt: null,
  roleCodes: new Set(["system_administrator"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

const userWith = (...grants: string[]): AuthenticatedUser => ({
  ...actor,
  capabilities: new Set(grants),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listAccessUsers).mockResolvedValue([]);
  vi.mocked(listAccessRoles).mockResolvedValue([]);
  vi.mocked(listAccessCapabilities).mockResolvedValue([]);
  vi.mocked(listAccessAudit).mockResolvedValue([]);
  vi.mocked(findAccessUser).mockResolvedValue({
    capabilityCodes: [],
    displayName: "User",
    email: "user@example.test",
    emailVerified: true,
    id: "user-id",
    lastLoginAt: null,
    roleCodes: [],
    status: "active",
    userType: "staff",
  });
});

describe("user access service authorization", () => {
  it("requires an explicit user or role read capability", async () => {
    await expect(
      getUserAccessView(userWith(), { limit: 100 }, { limit: 100 }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
  });

  it("allows user reads without exposing role records", async () => {
    await getUserAccessView(
      userWith(capabilities.userRead),
      { limit: 100 },
      { limit: 100 },
    );
    expect(listAccessUsers).toHaveBeenCalled();
    expect(listAccessRoles).not.toHaveBeenCalled();
  });

  it("separates status and role mutation capabilities", async () => {
    await expect(
      updateUserAccess(userWith(capabilities.userManage), "user-id", {
        roleCodes: ["programme_officer"],
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      updateUserAccess(userWith(capabilities.roleManage), "user-id", {
        status: "suspended",
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(updateAccessUser).not.toHaveBeenCalled();
  });

  it("requires both authorities for promotion and invitation", async () => {
    await expect(
      promoteUser(userWith(capabilities.userManage), "user-id", ["programme_officer"]),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(
      inviteUser(userWith(capabilities.userManage), {
        displayName: "New Staff",
        email: "staff@example.test",
        roleCodes: ["programme_officer"],
      }),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(promoteAccessUser).not.toHaveBeenCalled();
    expect(inviteAccessUser).not.toHaveBeenCalled();
  });

  it("requires audit read authority independently", async () => {
    await expect(getAuthorizationAudit(userWith(), { limit: 100 })).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    await getAuthorizationAudit(userWith(capabilities.auditRead), { limit: 100 });
    expect(listAccessAudit).toHaveBeenCalled();
  });

  it("delegates role capability changes to the transactional repository", async () => {
    vi.mocked(updateAccessRole).mockResolvedValue("role-id");
    vi.mocked(listAccessRoles).mockResolvedValue([
      {
        assignedUserCount: 0,
        capabilityCodes: ["user.read"],
        code: "role",
        description: null,
        id: "role-id",
        name: "Role",
      },
    ]);
    await expect(
      updateRole(userWith(capabilities.roleManage), "role-id", {
        capabilityCodes: ["user.read"],
        description: null,
        name: "Role",
      }),
    ).resolves.toMatchObject({ id: "role-id" });
    expect(updateAccessRole).toHaveBeenCalled();
  });
});
