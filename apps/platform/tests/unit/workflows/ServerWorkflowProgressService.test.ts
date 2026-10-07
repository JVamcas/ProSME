import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowCompletionProgressRepository",
  () => ({
    readWorkflowCompletionProgress: vi.fn().mockResolvedValue(null),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowProgressRepository",
  () => ({
    readWorkflowProgress: vi.fn(),
    readWorkflowTakenPaths: vi.fn(),
  }),
);

vi.mock("@/modules/workflows/infrastructure/WorkflowGraphRepository", () => ({
  findWorkflowGraph: vi.fn(),
}));

import { findWorkflowGraph } from "@/modules/workflows/infrastructure/WorkflowGraphRepository";
import { readWorkflowCompletionProgress } from "@/modules/workflows/infrastructure/WorkflowCompletionProgressRepository";
import { workflowProgressServiceFixture } from "../../support/WorkflowProgressServiceFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import {
  readWorkflowProgress,
  readWorkflowTakenPaths,
} from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findWorkflowGraph).mockResolvedValue(null);
  vi.mocked(readWorkflowTakenPaths).mockResolvedValue([]);
});

describe("workflow progress authorization", () => {
  it("rejects an application reader without workflow progress permission before querying", async () => {
    await expect(
      getWorkflowProgress(
        {
          ...actor,
          capabilities: new Set([permissionCodes.fundingApplicationAllRead]),
        },
        applicationId,
      ),
    ).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowProgress).not.toHaveBeenCalled();
    expect(findWorkflowGraph).not.toHaveBeenCalled();
    expect(readWorkflowTakenPaths).not.toHaveBeenCalled();
    expect(readWorkflowCompletionProgress).not.toHaveBeenCalled();
  });

  it("reads progress for a user with the dedicated permission", async () => {
    vi.mocked(readWorkflowProgress).mockResolvedValue(null);
    await expect(
      getWorkflowProgress(
        {
          ...actor,
          capabilities: new Set([permissionCodes.workflowInstanceAllRead]),
        },
        applicationId,
      ),
    ).resolves.toBeNull();
    expect(readWorkflowProgress).toHaveBeenCalledWith(applicationId);
  });

  it("shows peer assignments after the viewer submits while keeping peer scores hidden", async () => {
    const { record, completion } = workflowProgressServiceFixture(actor.id);
    const stage = record.stages[0];
    stage.tasks[0].status = "COMPLETED";
    stage.tasks[1].assignedUserName = "Peer reviewer";
    stage.tasks[1].assignedUserEmail = "peer@example.test";
    vi.mocked(readWorkflowProgress).mockResolvedValue(record);
    vi.mocked(readWorkflowCompletionProgress).mockResolvedValue(completion);

    const progress = await getWorkflowProgress(
      {
        ...actor,
        capabilities: new Set([
          permissionCodes.workflowInstanceAllRead,
          permissionCodes.workflowTaskAllRead,
          permissionCodes.workflowTaskAssignedRead,
        ]),
      },
      applicationId,
    );

    expect(progress?.stages[0].tasks[1]).toMatchObject({
      assignedRoleName: "Programme Officer",
      assignedUserName: "Peer reviewer",
      assignedUserEmail: "peer@example.test",
      blockedReason:
        "Peer scores and review content are hidden until this stage is completed.",
      canOpen: false,
    });
    const requirements = progress?.stages[0].completionRequirements;
    expect(requirements).not.toBeNull();
    expect(JSON.stringify(requirements)).not.toContain("64");
    expect(requirements?.requirements[1].children?.[0].detail).toContain(
      "hidden",
    );
  });

  it("links only tasks the actor can read in an active stage", async () => {
    const { task, record: initialRecord, completion } = workflowProgressServiceFixture(actor.id);
    vi.mocked(readWorkflowProgress).mockResolvedValue(initialRecord);
    vi.mocked(readWorkflowCompletionProgress).mockResolvedValue(completion);
    const takenPaths = [
      { transitionId: "executed-route", targetStageKey: "review" },
    ];
    vi.mocked(readWorkflowTakenPaths).mockResolvedValue(takenPaths);
    const progress = await getWorkflowProgress(
      {
        ...actor,
        capabilities: new Set([
          permissionCodes.workflowInstanceAllRead,
          permissionCodes.workflowTaskAssignedRead,
        ]),
      },
      applicationId,
    );

    expect(findWorkflowGraph).toHaveBeenCalledWith("bound-version");
    expect(readWorkflowCompletionProgress).toHaveBeenCalledWith(
      "workflow-one",
      ["stage-one"],
    );
    expect(
      progress?.stages[0].completionRequirements?.requirements[0].detail,
    ).toContain("0 of 3");
    expect(
      JSON.stringify(progress?.stages[0].completionRequirements),
    ).not.toContain("64");
    expect(progress).not.toHaveProperty("versionId");
    expect(progress?.graph).toBeNull();
    expect(readWorkflowTakenPaths).toHaveBeenCalledWith("workflow-one");
    expect(progress?.takenPaths).toEqual(takenPaths);
    expect(progress?.stages[0].tasks.map((item) => item.canOpen)).toEqual([
      true,
      false,
      false,
    ]);
    expect(progress?.stages[0].tasks.map((item) => item.taskType)).toEqual([
      "CONTRIBUTING",
      "CONTRIBUTING",
      "CONTRIBUTING",
    ]);
    expect(progress?.stages[0].tasks[0]).not.toHaveProperty("assignedUserId");
    expect(progress?.stages[0].tasks[0]).not.toHaveProperty("viewPermission");
    expect(progress?.stages[0].tasks[1]).toMatchObject({
      assignedRoleName: task.assignedRoleName,
      assignedUserEmail: task.assignedUserEmail,
      assignedUserName: task.assignedUserName,
      canOpen: false,
      status: "PENDING",
    });
    expect(progress?.stages[0].tasks[1].id).not.toBe("task-two");

    const record = await readWorkflowProgress(applicationId);
    for (const prerequisitesComplete of [false, true]) {
      vi.mocked(readWorkflowProgress).mockResolvedValue({
        ...record!,
        stages: record!.stages.map((stage) => ({
          ...stage,
          tasks: [
            {
              ...task,
              taskType: "STAGE_DECISION",
              prerequisitesComplete,
            },
          ],
        })),
      });
      const decisionProgress = await getWorkflowProgress(
        {
          ...actor,
          capabilities: new Set([
            permissionCodes.workflowInstanceAllRead,
            permissionCodes.workflowTaskAssignedRead,
          ]),
        },
        applicationId,
      );
      expect(decisionProgress?.stages[0].tasks[0]).toMatchObject({
        canOpen: true,
        blockedReason: prerequisitesComplete
          ? null
          : "Meet the required contributing review thresholds before making the stage decision.",
      });
      expect(decisionProgress?.stages[0].tasks[0]).not.toHaveProperty(
        "prerequisitesComplete",
      );
    }
    vi.mocked(readWorkflowProgress).mockResolvedValue({
      ...record!,
      stages: record!.stages.map((stage) => ({
        ...stage,
        status: "RETURNED",
        returnedAt: "2026-09-20T10:00:00.000Z",
      })),
    });
    const returned = await getWorkflowProgress(
      {
        ...actor,
        capabilities: new Set([
          permissionCodes.workflowInstanceAllRead,
          permissionCodes.workflowTaskAssignedRead,
        ]),
      },
      applicationId,
    );
    expect(returned?.stages[0].tasks.map((item) => item.canOpen)).toEqual([
      false,
      false,
      false,
    ]);
    expect(returned?.stages[0].tasks[1].id).toBe("task-two");
  });
});
