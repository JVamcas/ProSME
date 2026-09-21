import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/RuntimeAuditRepository",
  () => ({ listRuntimeAuditTrail: vi.fn().mockResolvedValue([]) }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getRuntimeAuditTrail } from "@/modules/workflows/application/runtime/ServerRuntimeAuditService";
import { listRuntimeAuditTrail } from "@/modules/workflows/infrastructure/RuntimeAuditRepository";

const actor: AuthenticatedUser = {
  capabilities: new Set(),
  createdAt: new Date(),
  displayName: "Auditor",
  email: "auditor@example.test",
  id: "10000000-0000-4000-8000-000000000001",
  identitySubject: "firebase-auditor",
  lastLoginAt: null,
  roleCodes: new Set(),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

describe("runtime audit service", () => {
  it("denies reads without the canonical audit permission", async () => {
    expect(() => getRuntimeAuditTrail(actor, "workflow-id"))
      .toThrow(PermissionDeniedError);
    expect(listRuntimeAuditTrail).not.toHaveBeenCalled();
  });

  it("returns the workflow trail to an authorized auditor", async () => {
    const authorized = {
      ...actor,
      capabilities: new Set([permissionCodes.auditRead]),
    };

    await expect(getRuntimeAuditTrail(authorized, "workflow-id"))
      .resolves.toEqual([]);
    expect(listRuntimeAuditTrail).toHaveBeenCalledWith("workflow-id");
  });
});
