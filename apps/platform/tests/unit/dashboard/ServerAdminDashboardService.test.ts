import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/AdminDashboardRepository", () => ({
  readAdminDashboard: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readAdminDashboard } from "@/db/repositories/AdminDashboardRepository";
import { getAdminDashboard } from "@/modules/dashboard/ServerAdminDashboardService";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Operations User",
    email: "operations@example.test",
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["programme_officer"]),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readAdminDashboard).mockResolvedValue({
    activities: [],
    metrics: {
      pendingDecision: 0,
      totalApplications: 0,
      underReview: 0,
    },
    statuses: [],
  });
});

describe("admin dashboard service", () => {
  it("requires operations access before querying metrics", async () => {
    await expect(getAdminDashboard(staff([]), "30")).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(readAdminDashboard).not.toHaveBeenCalled();
  });

  it("uses all-application visibility and the selected UTC period", async () => {
    const now = new Date("2026-09-15T10:00:00.000Z");
    const dashboard = await getAdminDashboard(
      staff([permissionCodes.fundingApplicationAllRead]),
      "30",
      now,
    );
    expect(readAdminDashboard).toHaveBeenCalledWith({
      actorId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
      since: new Date("2026-08-16T10:00:00.000Z"),
      visibility: "all",
    });
    expect(dashboard.metrics.informationRequests).toBeNull();
  });

  it("limits assigned readers and does not invent request totals", async () => {
    const dashboard = await getAdminDashboard(
      staff([
        permissionCodes.workflowTaskAssignedRead,
      ]),
      "all",
    );
    expect(readAdminDashboard).toHaveBeenCalledWith(expect.objectContaining({
      since: null,
      visibility: "assigned",
    }));
    expect(dashboard.metrics.informationRequests).toBeNull();
  });
});
