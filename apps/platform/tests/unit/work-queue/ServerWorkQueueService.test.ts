import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowSelfAssignmentPoolRepository", () => ({
  readSelfAssignmentPool: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowSelfAssignmentReleaseRepository", () => ({
  releaseSelfAssignedTask: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkQueueRepository", () => ({
  readWorkQueue: vi.fn(),
  writeTaskClaim: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readWorkQueue,
  writeTaskClaim,
} from "@/modules/workflows/infrastructure/WorkQueueRepository";
import { readSelfAssignmentPool } from "@/modules/workflows/infrastructure/WorkflowSelfAssignmentPoolRepository";
import { releaseSelfAssignedTask } from "@/modules/workflows/infrastructure/WorkflowSelfAssignmentReleaseRepository";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  claimTask,
  getWorkQueue,
  getSelfAssignmentPool,
  releaseTask,
} from "@/modules/work-queue/ServerWorkQueueService";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
    createdAt: new Date(),
    displayName: "Queue User",
    email: "queue@example.test",
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
  vi.mocked(readWorkQueue).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(readSelfAssignmentPool).mockResolvedValue({ items: [], total: 0 });
});

describe("work queue service", () => {
  it("requires work queue read capability before querying", async () => {
    await expect(getWorkQueue(staff([]), {
      limit: 25,
      scope: "mine",
    })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkQueue).not.toHaveBeenCalled();
  });

  it("passes actor scope and filters to the repository", async () => {
    const input = { limit: 25, scope: "mine" as const, search: "SMEF" };
    await getWorkQueue(staff([permissionCodes.workflowTaskPoolRead]), input);
    expect(readWorkQueue).toHaveBeenCalledWith(
      "79e20de0-3558-4d63-90a4-8c9f5125df07",
      input,
      undefined,
    );
  });

  it("requires pool permission and uses actor-scoped repository results", async () => {
    const input = { limit: 10, search: "Screen" };
    await expect(getSelfAssignmentPool(staff([]), input))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readSelfAssignmentPool).not.toHaveBeenCalled();
    await getSelfAssignmentPool(
      staff([permissionCodes.workflowTaskPoolRead]),
      input,
    );
    expect(readSelfAssignmentPool).toHaveBeenCalledWith(
      "79e20de0-3558-4d63-90a4-8c9f5125df07",
      input,
      undefined,
    );
  });

  it("requires own-release authority and reports context mismatch", async () => {
    const input = {
      correlationId: "16f2a85b-82a6-4594-9d37-c8ce4f284443",
      expectedRowVersion: 2,
      idempotencyKey: "b6174a66-e474-40eb-86cf-d75e110b037f",
      taskId: "c6ee71ce-0ed0-43b9-9381-e2c568634364",
    };
    await expect(releaseTask(staff([]), input))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(releaseSelfAssignedTask).not.toHaveBeenCalled();
    vi.mocked(releaseSelfAssignedTask).mockResolvedValue({ kind: "conflict" });
    await expect(releaseTask(
      staff([permissionCodes.workflowTaskClaim]),
      input,
    )).rejects.toBeInstanceOf(ResourceConflictError);
    expect(releaseSelfAssignedTask).toHaveBeenCalledWith({
      ...input,
      actorId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
    });
  });

  it("requires claim capability and translates compare-and-set conflicts", async () => {
    const input = {
      correlationId: "16f2a85b-82a6-4594-9d37-c8ce4f284443",
      expectedRowVersion: 1,
      idempotencyKey: "b6174a66-e474-40eb-86cf-d75e110b037f",
      taskId: "c6ee71ce-0ed0-43b9-9381-e2c568634364",
    };
    await expect(claimTask(staff([]), input)).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    vi.mocked(writeTaskClaim).mockResolvedValue({ kind: "conflict" });
    await expect(
      claimTask(staff([permissionCodes.workflowTaskClaim]), input),
    ).rejects.toBeInstanceOf(ResourceConflictError);
  });
});
