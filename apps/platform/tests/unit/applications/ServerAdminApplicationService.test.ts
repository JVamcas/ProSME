import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/AdminApplicationRepository", () => ({
  readAdminApplication: vi.fn(),
  readAdminApplications: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readAdminApplication,
  readAdminApplications,
} from "@/db/repositories/AdminApplicationRepository";
import {
  getAdminApplicationOverview,
  listAdminApplications,
} from "@/modules/applications/ServerAdminApplicationService";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Applications User",
    email: "applications@example.test",
    id: "29e20de0-3558-4d63-90a4-8c9f5125df07",
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["programme_officer"]),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

const input = { limit: 25, status: "all" as const };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readAdminApplication).mockResolvedValue(null);
  vi.mocked(readAdminApplications).mockResolvedValue({ items: [], total: 0 });
});

describe("admin applications service", () => {
  it("rejects users without either application read capability", async () => {
    await expect(listAdminApplications(staff([]), input)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(readAdminApplications).not.toHaveBeenCalled();
  });

  it("uses all visibility only for the broad read capability", async () => {
    await listAdminApplications(
      staff([permissionCodes.fundingApplicationAllRead]),
      input,
    );
    expect(readAdminApplications).toHaveBeenCalledWith(expect.objectContaining({
      actorId: "29e20de0-3558-4d63-90a4-8c9f5125df07",
      filters: input,
      visibility: "all",
    }));
  });

  it("uses task assignment scope for assigned readers", async () => {
    await listAdminApplications(
      staff([permissionCodes.workflowTaskAssignedRead]),
      input,
    );
    expect(readAdminApplications).toHaveBeenCalledWith(expect.objectContaining({
      visibility: "assigned",
    }));
  });

  it("loads database application details using capability visibility", async () => {
    const applicationId = "39e20de0-3558-4d63-90a4-8c9f5125df07";

    await getAdminApplicationOverview(
      staff([permissionCodes.workflowTaskAssignedRead]),
      applicationId,
    );

    expect(readAdminApplication).toHaveBeenCalledWith({
      actorId: "29e20de0-3558-4d63-90a4-8c9f5125df07",
      applicationId,
      visibility: "assigned",
    });
  });
});
