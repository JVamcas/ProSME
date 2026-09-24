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

  it("links only tasks the actor can read in an active stage", async () => {
    const task = {
      actionedAt: null,
      assignedRoleCode: "programme_officer",
      assignedRoleName: "Programme Officer",
      assignedUserEmail: "staff@example.test",
      assignedUserId: actor.id,
      taskDefinitionId: "definition-one",
      reviewerCount: 3,
      reviewRelease: "STAGE_COMPLETED" as const,
      thresholdSatisfied: false,
      assignedUserName: "Staff member",
      dueAt: null,
      id: "task-one",
      name: "Review application",
      required: true,
      status: "PENDING",
      viewPermission: permissionCodes.workflowTaskAssignedRead,
    };
    vi.mocked(readWorkflowProgress).mockResolvedValue({
      completedAt: null,
      id: "workflow-one",
      name: "SME workflow",
      stages: [{
        activatedAt: "2026-09-20T08:00:00.000Z",
        completedAt: null,
        description: "Review",
        id: "stage-one",
        iterationNumber: 1,
        name: "Review",
        sequence: 1,
        status: "ACTIVE",
        tasks: [
          task,
          { ...task, assignedUserId: "another-user", id: "task-two" },
          {
            ...task,
            assignedUserEmail: null,
            assignedUserId: null,
            assignedUserName: null,
            id: "task-three",
          },
        ],
      }],
      startedAt: "2026-09-20T08:00:00.000Z",
      status: "ACTIVE",
      terminalOutcome: null,
      versionNumber: 1,
    });

    const progress = await getWorkflowProgress({
      ...actor,
      capabilities: new Set([
        permissionCodes.workflowInstanceAllRead,
        permissionCodes.workflowTaskAssignedRead,
      ]),
    }, applicationId);

    expect(progress?.stages[0].tasks.map((item) => item.canOpen)).toEqual([
      true,
      false,
      false,
    ]);
    expect(progress?.stages[0].tasks[0]).not.toHaveProperty("assignedUserId");
    expect(progress?.stages[0].tasks[0]).not.toHaveProperty("viewPermission");
    expect(progress?.stages[0].tasks[1]).toMatchObject({
      assignedUserEmail: null,
      assignedUserName: null,
      canOpen: false,
      status: "PENDING",
    });
    expect(progress?.stages[0].tasks[1].id).not.toBe("task-two");
  });
});
