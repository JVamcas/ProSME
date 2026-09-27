import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/dashboard/infrastructure/ApplicantDashboardRepository",
  () => ({
    readApplicantDashboard: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService",
  () => ({
    listOwnedOpenRfiActions: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readApplicantDashboard } from "@/modules/dashboard/infrastructure/ApplicantDashboardRepository";
import { getApplicantDashboard } from "@/modules/dashboard/ServerApplicantDashboardService";
import { listOwnedOpenRfiActions } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const ownerId = "79e20de0-3558-4d63-90a4-8c9f5125df07";

function applicant(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Anna Ndeitunga",
    email: "anna@example.test",
    id: ownerId,
    identitySubject: "firebase-subject",
    lastLoginAt: null,
    roleCodes: new Set(["applicant"]),
    status: "active",
    updatedAt: new Date(),
    userType: "applicant",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readApplicantDashboard).mockResolvedValue({
    activities: [],
    metrics: {
      actionRequired: 2,
      applicationsInProgress: 1,
      openFundingOpportunities: 3,
      submittedApplications: 4,
    },
  });
  vi.mocked(listOwnedOpenRfiActions).mockResolvedValue([]);
});

describe("applicant dashboard service", () => {
  it("requires read-own access before querying metrics", async () => {
    await expect(getApplicantDashboard(applicant([]))).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(readApplicantDashboard).not.toHaveBeenCalled();
  });

  it("reads the authenticated applicant's metrics", async () => {
    const dashboard = await getApplicantDashboard(
      applicant([
        permissionCodes.fundingApplicationOwnRead,
        permissionCodes.fundingApplicationInformationRequestOwnRead,
      ]),
    );

    expect(readApplicantDashboard).toHaveBeenCalledOnce();
    expect(readApplicantDashboard).toHaveBeenCalledWith(ownerId);
    expect(dashboard).toEqual({
      activities: [],
      displayName: "Anna Ndeitunga",
      metrics: {
        actionRequired: 2,
        applicationsInProgress: 1,
        openFundingOpportunities: 3,
        submittedApplications: 4,
      },
      urgentRequests: [],
    });
  });
  it("returns the dashboard without RFI actions when RFI access is absent", async () => {
    const dashboard = await getApplicantDashboard(
      applicant([permissionCodes.fundingApplicationOwnRead]),
    );

    expect(readApplicantDashboard).toHaveBeenCalledWith(ownerId);
    expect(listOwnedOpenRfiActions).not.toHaveBeenCalled();
    expect(dashboard.urgentRequests).toEqual([]);
  });
});
