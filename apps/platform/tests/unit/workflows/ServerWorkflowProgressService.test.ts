import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowProgressRepository", () => ({
  readWorkflowProgress: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import { readWorkflowProgress } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

const applicationId = "11111111-1111-4111-8111-111111111111";
const actor: AuthenticatedUser = {
  capabilities: new Set(),
  createdAt: new Date(),
  displayName: "Staff member",
  email: "staff@example.test",
  id: "22222222-2222-4222-8222-222222222222",
  identitySubject: "staff",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

beforeEach(() => vi.clearAllMocks());

describe("workflow progress authorization", () => {
  it("rejects an application reader without workflow progress permission before querying", async () => {
    await expect(getWorkflowProgress({
      ...actor,
      capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
    }, applicationId)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowProgress).not.toHaveBeenCalled();
  });

  it("reads progress for a user with the dedicated permission", async () => {
    vi.mocked(readWorkflowProgress).mockResolvedValue(null);
    await expect(getWorkflowProgress({
      ...actor,
      capabilities: new Set([permissionCodes.workflowInstanceAllRead]),
    }, applicationId)).resolves.toBeNull();
    expect(readWorkflowProgress).toHaveBeenCalledWith(applicationId);
  });
});
