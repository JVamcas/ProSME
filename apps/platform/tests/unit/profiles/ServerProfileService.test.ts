import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/ProfileRepository", () => ({
  findApplicantProfile: vi.fn(),
  saveApplicantProfile: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  findApplicantProfile,
  saveApplicantProfile,
} from "@/db/repositories/ProfileRepository";
import {
  createApplicantDashboardSummary,
  createPortalContext,
  getApplicantProfile,
  updateApplicantProfile,
} from "@/modules/profiles/ServerProfileService";

const ownerId = "79e20de0-3558-4d63-90a4-8c9f5125df07";

function user(granted: string[]): AuthenticatedUser {
  return {
    id: ownerId,
    email: "owner@example.test",
    displayName: "Anna Ndeitunga",
    userType: "applicant",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    identitySubject: "private-firebase-subject",
    capabilities: new Set(granted),
    roleCodes: new Set(["applicant"]),
    profileComplete: true,
    businessProfileComplete: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("P3.1 profile ownership policy", () => {
  it("uses the authenticated owner id for the SQL read projection", async () => {
    vi.mocked(findApplicantProfile).mockResolvedValue(null);
    await getApplicantProfile(user([permissionCodes.userProfileOwnRead]));
    expect(findApplicantProfile).toHaveBeenCalledWith(ownerId);
  });

  it("rejects a profile update without the update-own capability", async () => {
    const request = updateApplicantProfile(
      user([permissionCodes.userProfileOwnRead]),
      {
        section: "personal",
        data: {
          firstName: "Anna",
          surname: "Ndeitunga",
          position: "Managing director",
          dateOfBirth: "",
          nationality: "Namibian",
          region: "Khomas",
        },
      },
    );

    await expect(request).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(saveApplicantProfile).not.toHaveBeenCalled();
  });

  it("does not expose identity subjects in the portal projection", () => {
    const context = createPortalContext(
      user([
        permissionCodes.userProfileOwnRead,
        permissionCodes.businessOwnRead,
      ]),
    );

    const dashboard = createApplicantDashboardSummary(
      user([permissionCodes.userProfileOwnRead]),
    );

    expect(dashboard.completion).toEqual({
      applicantProfile: true,
      businessProfile: false,
    });
    expect(context).not.toHaveProperty("firebaseUid");
    expect(context).not.toHaveProperty("identitySubject");
    expect(context.status).toBe("active");
    expect(context.availableSpaces).toEqual(["applicant"]);
    expect(context.defaultSpace).toBe("applicant");
    expect(context.capabilityCodes).toEqual([
      permissionCodes.businessOwnRead,
      permissionCodes.userProfileOwnRead,
    ]);
  });
});
