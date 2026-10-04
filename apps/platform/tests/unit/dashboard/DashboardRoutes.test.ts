import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/dashboard/infrastructure/AdminDashboardRepository", () => ({
  readAdminDashboard: vi.fn(),
}));
vi.mock(
  "@/modules/dashboard/infrastructure/ApplicantDashboardRepository",
  () => ({ readApplicantDashboard: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService",
  () => ({ listOwnedOpenRfiActions: vi.fn() }),
);

import { GET as staffGET } from "@/app/api/dashboard/staff/route";
import { GET as applicantGET } from "@/app/api/dashboard/applicant/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { readAdminDashboard } from "@/modules/dashboard/infrastructure/AdminDashboardRepository";
import { readApplicantDashboard } from "@/modules/dashboard/infrastructure/ApplicantDashboardRepository";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.fundingApplicationOwnRead]),
  createdAt: new Date(),
  displayName: "Synthetic Applicant",
  email: "test@example.test",
  id: "61111111-1111-4111-8111-111111111111",
  identitySubject: "synthetic",
  lastLoginAt: null,
  roleCodes: new Set(["applicant"]),
  status: "active",
  updatedAt: new Date(),
  userType: "applicant",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
  vi.mocked(readApplicantDashboard).mockResolvedValue({
    activities: [],
    metrics: {
      actionRequired: 0,
      applicationsInProgress: 2,
      openFundingOpportunities: 1,
      submittedApplications: 1,
    },
  });
  vi.mocked(readAdminDashboard).mockResolvedValue({
    activities: [],
    metrics: {
      informationRequests: 0,
      pendingDecision: 0,
      totalApplications: 1,
      underReview: 0,
    },
    statuses: [],
  });
});

describe("protected dashboard transports", () => {
  it("returns an own-scoped projection with no-store and correlation metadata", async () => {
    const response = await applicantGET(
      new Request("http://localhost/api/dashboard/applicant"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.data.metrics.applicationsInProgress).toBe(2);
    expect(body.meta.correlationId).toBe(
      response.headers.get("x-correlation-id"),
    );
    expect(readApplicantDashboard).toHaveBeenCalledWith(actor.id);
  });

  it.each([null, { ...actor, capabilities: new Set<string>() }])(
    "denies absent or unauthorized actors before reading data",
    async (user) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      const response = await applicantGET(
        new Request("http://localhost/api/dashboard/applicant"),
      );
      expect([401, 403]).toContain(response.status);
      expect(readApplicantDashboard).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid periods and unexpected transport input", async () => {
    for (const query of ["period=365", "period=30&actorId=another"]) {
      const response = await staffGET(
        new Request(`http://localhost/api/dashboard/staff?${query}`),
      );
      expect(response.status).toBe(400);
    }
    expect(readAdminDashboard).not.toHaveBeenCalled();
  });

  it("uses assigned visibility without accepting a browser supplied scope", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({
      ...actor,
      userType: "staff",
      roleCodes: new Set(["programme_officer"]),
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    });
    const response = await staffGET(
      new Request("http://localhost/api/dashboard/staff?period=all"),
    );
    expect(response.status).toBe(200);
    expect(readAdminDashboard).toHaveBeenCalledWith({
      actorId: actor.id,
      since: null,
      visibility: "assigned",
    });
  });
});
