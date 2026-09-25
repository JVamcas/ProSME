import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/firebase/admin", () => ({ getFirebaseAdminAuth: vi.fn() }));
vi.mock("@/modules/users/infrastructure/UserAccessRepository", () => ({
  findAccessUser: vi.fn(),
}));
vi.mock("@/modules/users/infrastructure/UserProvisioningRepository", () => ({
  provisionDirectoryApplicant: vi.fn(),
}));

import { getFirebaseAdminAuth } from "@/auth/firebase/admin";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { provisionUnprovisionedUser } from "@/modules/users/ServerUserProvisioningService";
import { findAccessUser } from "@/modules/users/infrastructure/UserAccessRepository";
import { provisionDirectoryApplicant } from "@/modules/users/infrastructure/UserProvisioningRepository";

const actor: AuthenticatedUser = {
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  capabilities: new Set([permissionCodes.userManage]),
  createdAt: new Date(),
  displayName: "Administrator",
  email: "admin@example.test",
  identitySubject: "admin-firebase",
  lastLoginAt: null,
  roleCodes: new Set(["system_administrator"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
const auth = { getUser: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFirebaseAdminAuth).mockReturnValue(auth as never);
  auth.getUser.mockResolvedValue({
    uid: "firebase-user",
    email: "person@example.test",
    displayName: "Person Name",
    emailVerified: false,
  });
  vi.mocked(provisionDirectoryApplicant).mockResolvedValue("app-user-id");
  vi.mocked(findAccessUser).mockResolvedValue({
    id: "app-user-id",
    email: "person@example.test",
    displayName: "Person Name",
    emailVerified: false,
    lastLoginAt: null,
    roleCodes: ["applicant"],
    capabilityCodes: [],
    status: "active",
    userType: "applicant",
  });
});

describe("manual user provisioning", () => {
  it("denies an actor without user management permission", async () => {
    const denied = { ...actor, capabilities: new Set<string>() };

    await expect(
      provisionUnprovisionedUser(denied, "firebase:firebase-user"),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("loads the Firebase account and provisions its verified identity data", async () => {
    const result = await provisionUnprovisionedUser(
      actor,
      "firebase:firebase-user",
    );

    expect(auth.getUser).toHaveBeenCalledWith("firebase-user");
    expect(provisionDirectoryApplicant).toHaveBeenCalledWith(actor.id, {
      uid: "firebase-user",
      email: "person@example.test",
      displayName: "Person Name",
      emailVerified: false,
    });
    expect(result).toMatchObject({ id: "app-user-id" });
  });

  it("rejects a PostgreSQL user ID instead of treating it as a Firebase UID", async () => {
    await expect(
      provisionUnprovisionedUser(actor, "app-user-id"),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(auth.getUser).not.toHaveBeenCalled();
  });

  it("falls back to email when Firebase has no display name", async () => {
    auth.getUser.mockResolvedValue({
      uid: "firebase-user",
      email: "person@example.test",
      displayName: null,
      emailVerified: true,
    });

    await provisionUnprovisionedUser(actor, "firebase:firebase-user");

    expect(provisionDirectoryApplicant).toHaveBeenCalledWith(
      actor.id,
      expect.objectContaining({ displayName: "person@example.test" }),
    );
  });
});
