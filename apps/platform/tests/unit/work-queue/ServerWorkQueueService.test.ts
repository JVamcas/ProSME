import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkQueueRepository", () => ({
  readWorkQueue: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { readWorkQueue } from "@/modules/workflows/infrastructure/WorkQueueRepository";
import { getWorkQueue } from "@/modules/work-queue/ServerWorkQueueService";

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
});

describe("work queue service", () => {
  it("requires assigned-task read permission", async () => {
    await expect(getWorkQueue(staff([]), {
      limit: 25,
      scope: "mine",
    })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkQueue).not.toHaveBeenCalled();
  });

  it("passes actor, search and pagination to the repository", async () => {
    const input = { limit: 25, scope: "mine" as const, search: "SMEF" };
    await getWorkQueue(staff([permissionCodes.workflowTaskAssignedRead]), input);
    expect(readWorkQueue).toHaveBeenCalledWith(
      "79e20de0-3558-4d63-90a4-8c9f5125df07",
      input,
      undefined,
    );
  });
});
