import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkQueueRepository", () => ({
  readWorkQueue: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET } from "@/app/api/admin/work-queue/route";
import type { AuthenticatedUser } from "@/auth/types";
import { readWorkQueue } from "@/modules/workflows/infrastructure/WorkQueueRepository";
import { getWorkQueue } from "@/modules/work-queue/application/ServerWorkQueueService";

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

describe("work queue scope transport", () => {
  it("denies assigned-only readers requesting the all-tasks monitor", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      staff([permissionCodes.workflowTaskAssignedRead]),
    );
    const response = await GET(new Request(
      "https://example.test/api/admin/work-queue?assignmentScope=all",
    ));
    expect(response.status).toBe(403);
    expect(readWorkQueue).not.toHaveBeenCalled();
  });

  it("passes the authorised all-tasks scope to the repository", async () => {
    const actor = staff([permissionCodes.workflowTaskAllRead]);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    const response = await GET(new Request(
      "https://example.test/api/admin/work-queue?assignmentScope=all",
    ));
    expect(response.status).toBe(200);
    expect(readWorkQueue).toHaveBeenCalledWith(
      actor.id,
      { assignmentScope: "all", limit: 25, scope: "mine" },
      undefined,
    );
  });

  it("rejects unsupported assignment scopes before querying", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      staff([permissionCodes.workflowTaskAllRead]),
    );
    const response = await GET(new Request(
      "https://example.test/api/admin/work-queue?assignmentScope=other-user",
    ));
    expect(response.status).toBe(400);
    expect(readWorkQueue).not.toHaveBeenCalled();
  });
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

  it("denies the all-assigned-tasks monitor to assigned-only readers", async () => {
    await expect(getWorkQueue(staff([
      permissionCodes.workflowTaskAssignedRead,
    ]), {
      assignmentScope: "all",
      limit: 25,
      scope: "mine",
    })).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkQueue).not.toHaveBeenCalled();
  });

  it("allows the monitor with the canonical all-tasks grant", async () => {
    const input = {
      assignmentScope: "all" as const,
      limit: 25,
      scope: "mine" as const,
    };
    await getWorkQueue(staff([permissionCodes.workflowTaskAllRead]), input);
    expect(readWorkQueue).toHaveBeenCalledWith(
      "79e20de0-3558-4d63-90a4-8c9f5125df07",
      input,
      undefined,
    );
  });
});
