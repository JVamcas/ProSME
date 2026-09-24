import { describe, expect, it } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  canAccessApplicantPortal,
  getAvailablePortalSpaces,
  getDefaultAuthenticatedPath,
} from "@/auth/authorization/portal-access";
import type { AuthenticatedUser } from "@/auth/types";

function user(
  granted: string[],
  status: AuthenticatedUser["status"] = "active",
): AuthenticatedUser {
  return {
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    email: "user@example.test",
    displayName: "Portal User",
    userType: "staff",
    status,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
    identitySubject: "firebase-subject",
    capabilities: new Set(granted),
    roleCodes: new Set(),
  };
}

describe("portal access policy", () => {
  it("rejects active staff without an applicant-scoped capability", () => {
    const staff = user([permissionCodes.fundingApplicationAllRead]);

    expect(canAccessApplicantPortal(staff)).toBe(false);
  });

  it.each(["suspended", "disabled"] as const)(
    "rejects a %s user even when an applicant capability is granted",
    (status) => {
      const inactiveUser = user(
        [permissionCodes.userProfileOwnRead],
        status,
      );

      expect(canAccessApplicantPortal(inactiveUser)).toBe(false);
    },
  );

  it("derives dual spaces and operations as the default", () => {
    const dualUser = user([
      permissionCodes.userProfileOwnRead,
      permissionCodes.fundingApplicationAllRead,
    ]);

    expect(getAvailablePortalSpaces(dualUser)).toEqual([
      "applicant",
      "operations",
    ]);
    expect(getDefaultAuthenticatedPath(dualUser)).toBe("/admin");
  });

  it("routes a content-only user to Payload", () => {
    const contentUser = user([permissionCodes.cmsAccess]);

    expect(getDefaultAuthenticatedPath(contentUser)).toBe("/cms");
  });
});
