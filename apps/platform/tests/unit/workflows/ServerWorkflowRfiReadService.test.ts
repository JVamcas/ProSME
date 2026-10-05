import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRfiReadRepository",
  () => ({
    readApplicationWorkflowRfis: vi.fn(),
    readAssignedApplicationWorkflowRfis: vi.fn(),
    readOwnedApplicationRfis: vi.fn(),
    readOwnedOpenRfiActions: vi.fn(),
    readOwnedWorkflowRfi: vi.fn(),
    readTaskWorkflowRfi: vi.fn(),
    readTaskWorkflowRfis: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskRepository",
  () => ({ readWorkflowTask: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  getOwnedWorkflowRfi,
  listContextualApplicationRfis,
  listOwnedApplicationRfis,
  listTaskWorkflowRfis,
} from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";
import {
  readApplicationWorkflowRfis,
  readAssignedApplicationWorkflowRfis,
  readOwnedApplicationRfis,
  readOwnedWorkflowRfi,
  readTaskWorkflowRfis,
} from "@/modules/workflows/infrastructure/WorkflowRfiReadRepository";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const applicationId = "20000000-0000-4000-8000-000000000001";
const requestId = "30000000-0000-4000-8000-000000000001";
const taskId = "40000000-0000-4000-8000-000000000001";

function user(...permissions: string[]) {
  return {
    capabilities: new Set(permissions),
    id: actorId,
    status: "active",
  } as unknown as AuthenticatedUser;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readOwnedApplicationRfis).mockResolvedValue([]);
  vi.mocked(readOwnedWorkflowRfi).mockResolvedValue({ id: requestId } as never);
  vi.mocked(readTaskWorkflowRfis).mockResolvedValue([]);
});

describe("ServerWorkflowRfiReadService", () => {
  it("scopes applicant lists and detail reads to the authenticated owner", async () => {
    const actor = user(
      permissionCodes.fundingApplicationInformationRequestOwnRead,
    );
    await listOwnedApplicationRfis(actor, applicationId);
    await getOwnedWorkflowRfi(actor, applicationId, requestId);

    expect(readOwnedApplicationRfis).toHaveBeenCalledWith({
      applicationId,
      ownerUserId: actorId,
    });
    expect(readOwnedWorkflowRfi).toHaveBeenCalledWith({
      applicationId,
      ownerUserId: actorId,
      requestInformationId: requestId,
    });
  });

  it("denies applicant reads without the canonical own-read permission", () => {
    expect(() => listOwnedApplicationRfis(user(), applicationId)).toThrow();
    expect(readOwnedApplicationRfis).not.toHaveBeenCalled();
  });

  it("requires both task visibility and the task's contextual permission", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue({
      permissions: { view: permissionCodes.workflowTaskAssignedRead },
    } as never);
    await listTaskWorkflowRfis(
      user(permissionCodes.workflowTaskAssignedRead),
      taskId,
    );
    expect(readWorkflowTask).toHaveBeenCalledWith(
      actorId, taskId, false, [permissionCodes.workflowTaskAssignedRead],
    );
    expect(readTaskWorkflowRfis).toHaveBeenCalledWith(taskId);

    await expect(listTaskWorkflowRfis(user(), taskId)).rejects.toThrow();
  });

  it("rejects a task outside the actor's assignment or COI clearance", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue(null);
    await expect(listTaskWorkflowRfis(
      user(permissionCodes.workflowTaskAssignedRead), taskId,
    )).rejects.toThrow();
    expect(readTaskWorkflowRfis).not.toHaveBeenCalled();
  });

  it("uses all-scope application history when granted", async () => {
    vi.mocked(readApplicationWorkflowRfis).mockResolvedValue([]);
    await listContextualApplicationRfis(
      user(permissionCodes.fundingApplicationAllRead),
      applicationId,
    );
    expect(readApplicationWorkflowRfis).toHaveBeenCalledWith(applicationId);
    expect(readAssignedApplicationWorkflowRfis).not.toHaveBeenCalled();
  });

  it("uses assignment-scoped history for assigned readers", async () => {
    vi.mocked(readAssignedApplicationWorkflowRfis).mockResolvedValue([]);
    await listContextualApplicationRfis(
      user(permissionCodes.workflowTaskAssignedRead),
      applicationId,
    );
    expect(readAssignedApplicationWorkflowRfis).toHaveBeenCalledWith(
      applicationId,
      actorId,
    );
  });
});
