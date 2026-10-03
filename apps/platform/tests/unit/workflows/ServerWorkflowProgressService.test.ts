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
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
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
      prerequisitesComplete: true,
      assignedUserName: "Staff member",
      dueAt: null,
      id: "task-one",
      name: "Review application",
      required: true,
      status: "PENDING",
      taskType: "CONTRIBUTING" as const,
      viewPermission: permissionCodes.workflowTaskAssignedRead,
    };
    vi.mocked(readWorkflowProgress).mockResolvedValue({
      completedAt: null,
      id: "workflow-one",
      name: "SME Fund workflow",
      stages: [
        {
          activatedAt: "2026-09-20T08:00:00.000Z",
          completedAt: null,
          description: "Review",
          id: "stage-one",
          iterationNumber: 1,
          name: "Review",
          sequence: 1,
          stableKey: "review",
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
        },
      ],
      startedAt: "2026-09-20T08:00:00.000Z",
      status: "ACTIVE",
      terminalOutcome: null,
      versionNumber: 1,
      versionId: "bound-version",
    });

    vi.mocked(readWorkflowCompletionProgress).mockResolvedValue({
      targets: [
        {
          application: { score: 64 },
          eligibility: {},
          fundingCall: {},
          completedAt: null,
          stageInstanceId: "stage-one",
          stageDefinitionId: "stage-definition",
          stageKey: "review",
          status: "ACTIVE",
          workflowInstanceId: "workflow-one",
          workflowVersionId: "bound-version",
          exitCondition: {
            id: "exit",
            kind: "GROUP",
            combinator: "AND",
            children: [
              {
                id: "score",
                kind: "CONDITION",
                operator: basicOperators.EQUALS,
                leftOperand: { kind: "FIELD", key: "application.score" },
                rightOperand: { kind: "CONSTANT", value: 70 },
              },
            ],
          },
        },
      ],
      requirements: [
        {
          stageInstanceId: "stage-one",
          taskDefinitionId: "definition-one",
          taskKey: "review",
          denominator: 3,
          completedCount: 0,
          completedTaskIds: [],
          completionMode: "ALL",
          completionPercentage: null,
          requiredCompletionCount: 3,
        },
      ],
      values: [],
      priorStages: [],
    });
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
      assignedUserEmail: null,
      assignedUserName: null,
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
        canOpen: prerequisitesComplete,
        blockedReason: prerequisitesComplete
          ? null
          : "Complete all contributing tasks before making the stage decision.",
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
