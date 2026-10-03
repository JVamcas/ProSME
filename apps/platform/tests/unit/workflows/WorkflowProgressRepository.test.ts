import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import {
  readWorkflowProgress,
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
    prerequisitesComplete: true,
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
    prerequisitesComplete: false,
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

const orderBy = vi.fn();
const where = vi.fn(() => ({ orderBy }));
const leftJoin = vi.fn(() => ({ leftJoin, where }));
const innerJoin = vi.fn(() => ({ innerJoin, leftJoin }));
const from = vi.fn(() => ({ innerJoin }));
const select = vi.fn(() => ({ from }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({ select } as never);
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
        prerequisitesComplete: true,
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
    expect(progress?.stages[1].tasks[0].prerequisitesComplete).toBe(false);
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        iterationNumber: expect.anything(),
        stageId: expect.anything(),
        stageStatus: expect.anything(),
        taskType: expect.anything(),
        prerequisitesComplete: expect.anything(),
      }),
    );
    expect(orderBy).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });

  it("retains cross-run evidence while excluding replacements within the same run", async () => {
    const progress = await readWorkflowProgress("application-id");
    expect(progress?.stages[0].tasks[0].id).toBe("task-one");
    const joins = leftJoin.mock.calls as unknown as [unknown, SQL][];
    const taskJoin = joins.find((call) => {
      const query = new PgDialect().sqlToQuery(call[1]);
      return query.sql.includes("supersedes_task_id");
    });
    expect(taskJoin).toBeDefined();
    const query = new PgDialect().sqlToQuery(taskJoin![1]);
    expect(query.sql).toContain("successor.stage_instance_id =");
    expect(query.sql).toContain('"app_workflow_tasks"."stage_instance_id"');
  });

  it("projects Return closure separately using persisted rework", async () => {
    orderBy.mockResolvedValue([{ ...rows[0], stageReturned: true }]);
    const progress = await readWorkflowProgress("application-id");
    expect(progress?.stages[0]).toMatchObject({
      status: "RETURNED",
      completedAt: null,
      returnedAt: "2026-09-20T10:00:00.000Z",
    });
    expect(progress?.stages[0].tasks).toHaveLength(1);
    const selections = select.mock.calls as unknown as [Record<string, SQL>][];
    const projection = selections[0][0];
    const query = new PgDialect().sqlToQuery(projection.stageReturned);
    expect(query.sql).toContain("rework.source_stage_instance_id =");
    expect(query.sql).toContain("rework.workflow_instance_id =");
  });

  it("shows configured tasks and assignment targets for stages awaiting activation", async () => {
    orderBy.mockResolvedValue([{
      ...rows[0],
      activatedAt: null,
      iterationNumber: null,
      stageId: null,
      stageStatus: null,
      stageCompletedAt: null,
      taskId: null,
      taskStatus: null,
      taskActionedAt: null,
      reviewerCount: 3,
    }]);
    const progress = await readWorkflowProgress("application-id");
    expect(progress?.stages[0].status).toBe("NOT_STARTED");
    expect(progress?.stages[0].tasks[0]).toMatchObject({
      id: "planned-definition-one",
      name: "Eligibility review",
      assignedRoleName: "Programme Officer",
      assignedUserName: "Reviewer",
      planned: true,
      configuredReviewerCount: 3,
      status: "WAITING",
    });
    const joins = leftJoin.mock.calls as unknown as [unknown, SQL][];
    const conditions = joins.map((call) => new PgDialect().sqlToQuery(call[1]).sql);
    expect(conditions.some((condition) =>
      condition.includes('"app_workflow_stage_instances"."id" is null') &&
      condition.includes('"app_stage_task_definitions"."stage_id"'),
    )).toBe(true);
    expect(conditions.some((condition) => condition.includes('"assignment_user_id"'))).toBe(true);
    expect(conditions.some((condition) => condition.includes('"assignment_role_id"'))).toBe(true);
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
