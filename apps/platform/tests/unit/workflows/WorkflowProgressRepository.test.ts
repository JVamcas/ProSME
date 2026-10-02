import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import {
  readWorkflowProgress,
  readWorkflowTakenPaths,
} from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

const rows = [
  {
    activatedAt: new Date("2026-09-20T08:00:00Z"),
    completedAt: null,
    instanceId: "instance-id",
    instanceStatus: "ACTIVE" as const,
    iterationNumber: 1,
    stageCompletedAt: new Date("2026-09-20T10:00:00Z"),
    stageDescription: "Check eligibility",
    stageId: "stage-run-one",
    stageName: "Screening",
    stageSequence: 1,
    stageStableKey: "screening",
    versionId: "bound-version",
    stageStatus: "COMPLETED" as const,
    taskActionedAt: new Date("2026-09-20T10:00:00Z"),
    taskDefinitionId: "definition-one",
    reviewerCount: 1,
    reviewRelease: "STAGE_COMPLETED",
    thresholdSatisfied: false,
    taskAssignedRoleCode: "programme_officer",
    taskAssignedRoleName: "Programme Officer",
    taskAssignedUserEmail: "reviewer@example.test",
    taskAssignedUserId: "reviewer-id",
    taskAssignedUserName: "Reviewer",
    taskDueAt: new Date("2026-09-20T09:00:00Z"),
    taskId: "task-one",
    taskName: "Eligibility review",
    taskOrder: 1,
    taskRequired: true,
    taskStatus: "COMPLETED" as const,
    taskType: "CONTRIBUTING" as const,
    taskViewPermission: { view: "workflow.task.assigned.read" },
    startedAt: new Date("2026-09-20T08:00:00Z"),
    terminalOutcome: null,
    versionMetadata: {
      code: "SME Fund",
      name: "SME Fund workflow",
      description: "",
    },
    versionNumber: 2,
  },
  {
    activatedAt: new Date("2026-09-21T08:00:00Z"),
    completedAt: null,
    instanceId: "instance-id",
    instanceStatus: "ACTIVE" as const,
    iterationNumber: 2,
    stageCompletedAt: null,
    stageDescription: "Check eligibility",
    stageId: "stage-run-two",
    stageName: "Screening",
    stageSequence: 1,
    stageStableKey: "screening",
    versionId: "bound-version",
    stageStatus: "ACTIVE" as const,
    taskActionedAt: null,
    taskDefinitionId: "definition-two",
    reviewerCount: 1,
    reviewRelease: "STAGE_COMPLETED",
    thresholdSatisfied: false,
    taskAssignedRoleCode: "programme_officer",
    taskAssignedRoleName: "Programme Officer",
    taskAssignedUserEmail: null,
    taskAssignedUserId: null,
    taskAssignedUserName: null,
    taskDueAt: null,
    taskId: "task-two",
    taskName: "Second eligibility review",
    taskOrder: 1,
    taskRequired: false,
    taskStatus: "PENDING" as const,
    taskType: "STAGE_DECISION" as const,
    taskViewPermission: { view: "workflow.task.assigned.read" },
    startedAt: new Date("2026-09-20T08:00:00Z"),
    terminalOutcome: null,
    versionMetadata: {
      code: "SME Fund",
      name: "SME Fund workflow",
      description: "",
    },
    versionNumber: 2,
  },
];

const pathWhere = vi.fn();
const pathLeftJoin = vi.fn(() => ({
  leftJoin: pathLeftJoin,
  where: pathWhere,
}));
const pathFrom = vi.fn(() => ({ leftJoin: pathLeftJoin }));
const selectDistinct = vi.fn(() => ({ from: pathFrom }));

const orderBy = vi.fn();
const where = vi.fn(() => ({ orderBy }));
const leftJoin = vi.fn(() => ({ leftJoin, where }));
const innerJoin = vi.fn(() => ({ innerJoin, leftJoin }));
const from = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ select, selectDistinct } as never);
  orderBy.mockResolvedValue(rows);
});

describe("workflow progress projection", () => {
  it("keeps repeated stage runs separate and ordered by stage then iteration", async () => {
    const progress = await readWorkflowProgress("application-id");

    expect(progress?.name).toBe("SME Fund workflow");
    expect(progress?.versionNumber).toBe(2);
    expect(progress?.versionId).toBe("bound-version");
    expect(progress?.stages[0].stableKey).toBe("screening");
    expect(
      progress?.stages.map((stage) => [
        stage.id,
        stage.iterationNumber,
        stage.status,
      ]),
    ).toEqual([
      ["stage-run-one", 1, "COMPLETED"],
      ["stage-run-two", 2, "ACTIVE"],
    ]);
    expect(progress?.stages[0].completedAt).toBe("2026-09-20T10:00:00.000Z");
    expect(progress?.stages[0].tasks).toEqual([
      {
        actionedAt: "2026-09-20T10:00:00.000Z",
        assignedRoleCode: "programme_officer",
        assignedRoleName: "Programme Officer",
        assignedUserEmail: "reviewer@example.test",
        assignedUserId: "reviewer-id",
        taskDefinitionId: "definition-one",
        reviewerCount: 1,
        reviewRelease: "STAGE_COMPLETED",
        thresholdSatisfied: false,
        assignedUserName: "Reviewer",
        dueAt: "2026-09-20T09:00:00.000Z",
        id: "task-one",
        name: "Eligibility review",
        required: true,
        status: "COMPLETED",
        taskType: "CONTRIBUTING",
        viewPermission: "workflow.task.assigned.read",
      },
    ]);
    expect(progress?.stages[1].tasks[0].taskType).toBe("STAGE_DECISION");
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        iterationNumber: expect.anything(),
        stageId: expect.anything(),
        stageStatus: expect.anything(),
        taskType: expect.anything(),
      }),
    );
    expect(orderBy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("returns no progress when the application has no workflow instance", async () => {
    orderBy.mockResolvedValue([]);
    await expect(readWorkflowProgress("application-id")).resolves.toBeNull();
  });

  it("reports multiple active parallel stages independently", async () => {
    orderBy.mockResolvedValue([
      {
        ...rows[1],
        iterationNumber: 1,
        stageId: "technical-stage",
        stageName: "Technical assessment",
        stageSequence: 2,
      },
      {
        ...rows[1],
        iterationNumber: 1,
        stageId: "financial-stage",
        stageName: "Financial review",
        stageSequence: 3,
        taskId: "financial-task",
      },
    ]);

    const progress = await readWorkflowProgress("application-id");

    expect(progress?.stages.map((stage) => [stage.name, stage.status])).toEqual(
      [
        ["Technical assessment", "ACTIVE"],
        ["Financial review", "ACTIVE"],
      ],
    );
  });
});

describe("workflow taken path projection", () => {
  it("selects distinct executed branches in the instance scope and excludes unsuccessful targets", async () => {
    const paths = [
      { transitionId: "route-one", targetStageKey: "technical" },
      { transitionId: "terminal-route", targetStageKey: null },
    ];
    pathWhere.mockResolvedValue(paths);
    await expect(readWorkflowTakenPaths("instance-id")).resolves.toEqual(paths);
    expect(selectDistinct).toHaveBeenCalledWith({
      transitionId: expect.anything(),
      targetStageKey: expect.anything(),
    });
    const query = new PgDialect().sqlToQuery(pathWhere.mock.calls[0][0]);
    expect(query.sql).toContain(
      '"app_workflow_transition_executions"."workflow_instance_id"',
    );
    expect(query.params).toEqual([
      "instance-id",
      "ACTIVATED",
      "ALREADY_ACTIVE",
      "JOIN_PENDING",
      "WORKFLOW_COMPLETED",
      "WORKFLOW_REJECTED",
    ]);
    expect(query.params).not.toContain("ENTRY_CONDITION_FAILED");
    expect(query.params).not.toContain("RECORDED");
  });

  it("returns no highlighted paths before a transition has executed", async () => {
    pathWhere.mockResolvedValue([]);
    await expect(readWorkflowTakenPaths("instance-id")).resolves.toEqual([]);
  });
});
