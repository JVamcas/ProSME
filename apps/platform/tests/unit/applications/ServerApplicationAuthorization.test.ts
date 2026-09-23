import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/infrastructure/ApplicationRepository", () => ({
  createOwnedApplication: vi.fn(),
  findOwnedApplication: vi.fn(),
  findOwnedApplicationByOpportunity: vi.fn(),
  findAllApplications: vi.fn(),
  findApplicationsAssignedTo: vi.fn(),
  findAssignedApplicationById: vi.fn(),
  findApplicationById: vi.fn(),
  listOwnedApplications: vi.fn(),
  updateOwnedApplication: vi.fn(),
}));
vi.mock("@/db/repositories/BusinessRepository", () => ({
  findOwnedBusiness: vi.fn(),
}));
vi.mock("@/db/repositories/ApplicationDocumentRepository", () => ({
  hasRequiredApplicationDocuments: vi.fn(),
}));
vi.mock(
  "@/modules/funding-calls/ServerFundingOpportunityIntegration",
  () => ({
    resolvePublishedApplicationFormBinding: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findAllApplications,
  findApplicationById,
  findApplicationsAssignedTo,
  findAssignedApplicationById,
} from "@/modules/applications/infrastructure/ApplicationRepository";
import {
  getApplication,
  getApplications,
} from "@/modules/applications/ServerApplicationService";

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
    const user = staffUser([permissionCodes.fundingApplicationAllRead]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findAllApplications).toHaveBeenCalledOnce();
  });

  it("limits assigned readers to their repository scope", async () => {
    vi.mocked(findApplicationsAssignedTo).mockResolvedValue([]);
    const user = staffUser([permissionCodes.workflowTaskAssignedRead]);

    await expect(getApplications(user)).resolves.toEqual([]);
    expect(findApplicationsAssignedTo).toHaveBeenCalledWith(user.id);
    expect(findAllApplications).not.toHaveBeenCalled();
  });

  it("rejects broad admin access without an application read grant", async () => {
    const user = staffUser([permissionCodes.userManage]);

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
