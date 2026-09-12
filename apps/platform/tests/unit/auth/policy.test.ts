import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/auth/types";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
  can,
  requireCapability,
} from "@/auth/authorization/policy";

function user(status: AuthenticatedUser["status"], granted: string[]): AuthenticatedUser {
  return {
    id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    email: "user@example.test",
    displayName: "Test User",
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

describe("capability policy", () => {
  it("allows active users with the requested capability", () => {
    expect(can(user("active", ["cms.access"]), "cms.access")).toBe(true);
  });

  it("denies suspended users even when the capability is assigned", () => {
    expect(can(user("suspended", ["cms.access"]), "cms.access")).toBe(false);
  });

  it("denies disabled users immediately", () => {
    expect(can(user("disabled", ["cms.access"]), "cms.access")).toBe(false);
  });

  it("distinguishes missing authentication from missing permission", () => {
    expect(() => requireCapability(null, "cms.access")).toThrow(AuthenticationRequiredError);
    expect(() => requireCapability(user("active", []), "cms.access")).toThrow(PermissionDeniedError);
  });
});
