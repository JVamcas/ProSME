import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/ApplicantDashboardRepository", () => ({
  readApplicantDashboard: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readApplicantDashboard } from "@/db/repositories/ApplicantDashboardRepository";
import { getApplicantDashboard } from "@/modules/dashboard/ServerApplicantDashboardService";

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
      applicant([capabilities.applicationReadOwn]),
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
    });
  });
});
