import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/application.repository", () => ({
  findAllApplications: vi.fn(),
  findApplicationsAssignedTo: vi.fn(),
  findAssignedApplicationById: vi.fn(),
  findApplicationById: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findAllApplications,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
  findApplicationById,
} from "@/db/repositories/application.repository";
import {
  getApplication,
  getApplications,
} from "@/modules/applications/application.service";

function staffUser(granted: string[]): AuthenticatedUser {
  return {
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    email: "staff@example.test",
    displayName: "Staff User",
    userType: "staff",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    identitySubject: "firebase-subject",
    capabilities: new Set(granted),
    roleCodes: new Set(["programme_officer"]),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("application service authorization", () => {
  it("loads records through the repository for authorized staff", async () => {
    vi.mocked(findAllApplications).mockResolvedValue([]);
    const user = staffUser([capabilities.applicationReadAll]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findAllApplications).toHaveBeenCalledOnce();
  });

  it("limits assigned readers to their repository scope", async () => {
    vi.mocked(findApplicationsAssignedTo).mockResolvedValue([]);
    const user = staffUser([capabilities.applicationReadAssigned]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findApplicationsAssignedTo).toHaveBeenCalledWith(user.id);
    expect(findAllApplications).not.toHaveBeenCalled();
  });

  it("rejects broad admin access without an application read grant", async () => {
    const user = staffUser([capabilities.adminAccess]);

    await expect(getApplications(user)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(findAllApplications).not.toHaveBeenCalled();
    expect(findApplicationsAssignedTo).not.toHaveBeenCalled();
  });

  it("checks authorization before loading a single application", async () => {
    const user = staffUser([]);

    await expect(getApplication(user, "SMEF-1")).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(findApplicationById).not.toHaveBeenCalled();
    expect(findAssignedApplicationById).not.toHaveBeenCalled();
  });
});
