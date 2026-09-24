import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowAssignmentHistoryRepository", () => ({
  readAssignmentHistory: vi.fn().mockResolvedValue({ items: [], total: 0 }),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getAssignmentHistory } from "@/modules/workflows/application/runtime/ServerWorkflowAssignmentHistoryService";
import { readAssignmentHistory } from "@/modules/workflows/infrastructure/WorkflowAssignmentHistoryRepository";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Auditor",
    email: "auditor@example.test",
    id: "11111111-1111-4111-8111-111111111111",
    identitySubject: "firebase-auditor",
    lastLoginAt: null,
    roleCodes: new Set(),
    status: "active",
    updatedAt: new Date(),
    userType: "staff",
  };
}

describe("assignment history access", () => {
  it("requires both audit and all-task read permissions", async () => {
    const taskId = "22222222-2222-4222-8222-222222222222";
    const input = { limit: 25 };
    await expect(getAssignmentHistory(staff([]), taskId, input))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    await expect(getAssignmentHistory(
      staff([permissionCodes.auditRead]),
      taskId,
      input,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readAssignmentHistory).not.toHaveBeenCalled();
    await getAssignmentHistory(staff([
      permissionCodes.auditRead,
      permissionCodes.workflowTaskAllRead,
    ]), taskId, input);
    expect(readAssignmentHistory).toHaveBeenCalledWith(taskId, input);
  });
});
