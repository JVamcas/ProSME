import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/StageInstanceRepository", () => ({
  createStageInstance: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskWriteRepository",
  () => ({ createWorkflowTasks: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskAutoAssignmentRepository",
  () => ({ allocateStageReviewers: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowReworkDataRepository",
  () => ({ initializeWorkflowReworkData: vi.fn() }),
);

import { workflowAuditEntries, workflowEvents } from "@/db/schema";
import { createStageInstance } from "@/modules/workflows/infrastructure/StageInstanceRepository";
import {
  loadIncompleteJoinPredecessors,
  persistStageActivation,
} from "@/modules/workflows/infrastructure/StageActivationRepository";
import { createWorkflowTasks } from "@/modules/workflows/infrastructure/WorkflowTaskWriteRepository";
import { allocateStageReviewers } from "@/modules/workflows/infrastructure/WorkflowTaskAutoAssignmentRepository";
import { initializeWorkflowReworkData } from "@/modules/workflows/infrastructure/WorkflowReworkDataRepository";
import { stageActivationTarget } from "../../support/StageActivationTargetFixture";

const activatedAt = new Date("2026-09-21T09:00:00.000Z");
const stageId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const select = vi.fn(() => ({
  from: () => ({
    where: () => ({
      orderBy: () => ({ limit: async () => [] }),
    }),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(initializeWorkflowReworkData).mockResolvedValue([
    { taskId, sourceTaskId: "99999999-9999-4999-8999-999999999999" },
  ]);
  vi.mocked(allocateStageReviewers).mockResolvedValue(
    new Map([
      [
        "66666666-6666-4666-8666-666666666666",
        [
          "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        ],
      ],
    ]),
  );
  vi.mocked(createStageInstance).mockResolvedValue({
    activatedAt,
    completedAt: null,
    id: stageId,
    iterationNumber: 1,
    rowVersion: 1,
    referralContext: null,
    returnContext: null,
    status: "ACTIVE",
    workflowInstanceId: "33333333-3333-4333-8333-333333333333",
    workflowStageDefinitionId: "44444444-4444-4444-8444-444444444444",
  });
  vi.mocked(createWorkflowTasks).mockResolvedValue([
    {
      assignedRoleId: "55555555-5555-4555-8555-555555555555",
      assignedUserId: null,
      claimedAt: null,
      completedAt: null,
      createdAt: activatedAt,
      dueAt: new Date("2026-09-22T09:00:00.000Z"),
      formVersionId: null,
      id: taskId,
      rowVersion: 1,
      reviewerSlot: 1,
      supersedesTaskId: null,
      stageInstanceId: stageId,
      startedAt: null,
      status: "PENDING",
      workflowTaskDefinitionId: "66666666-6666-4666-8666-666666666666",
    },
  ]);
});

describe("stage activation repository", () => {
  it("returns only incomplete join predecessor projections", async () => {
    const execute = vi.fn().mockResolvedValue({
      rows: [
        { stageKey: "FINANCIAL_REVIEW" },
        { stageKey: "TECHNICAL_ASSESSMENT" },
      ],
    });

    await expect(loadIncompleteJoinPredecessors(
      { execute } as never,
      "33333333-3333-4333-8333-333333333333",
      "44444444-4444-4444-8444-444444444444",
    )).resolves.toEqual(["FINANCIAL_REVIEW", "TECHNICAL_ASSESSMENT"]);
    expect(execute).toHaveBeenCalledOnce();
  });

  it.each([null, "RETAIN", "CLEAR"] as const)("persists stage activation with retention policy %s atomically", async (dataHandling) => {
    const inserted: Array<{ table: unknown; value: unknown }> = [];
    const insert = vi.fn((table: unknown) => ({
      values: vi.fn((value: unknown) => {
        inserted.push({ table, value });
        return Promise.resolve();
      }),
    }));
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));

    const result = await persistStageActivation(
      { insert, select, update } as never,
      {
        activatedAt,
        actorId: "77777777-7777-4777-8777-777777777777",
        correlationId: "88888888-8888-4888-8888-888888888888",
        iterationNumber: 1,
        returnContext: dataHandling ? { dataHandling } : null,
        target: stageActivationTarget,
        tasks: [
          {
            formVersionId: null,
            id: "66666666-6666-4666-8666-666666666666",
            name: "Review application",
            namedUserOverrideId: null,
            roleId: "55555555-5555-4555-8555-555555555555",
            stableKey: "CHECKLIST",
            reviewerCount: 3,
            taskType: "CONTRIBUTING",
          },
        ],
      },
    );

    expect(result.stage.id).toBe(stageId);
    if (dataHandling) {
      expect(result.tasks[0].supersedesTaskId)
        .toBe("99999999-9999-4999-8999-999999999999");
      expect(initializeWorkflowReworkData).toHaveBeenCalledWith(
        expect.anything(),
        {
          actorId: "77777777-7777-4777-8777-777777777777",
          correlationId: "88888888-8888-4888-8888-888888888888",
          dataHandling,
          stageInstanceId: stageId,
        },
      );
      expect(vi.mocked(createWorkflowTasks).mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(initializeWorkflowReworkData).mock.invocationCallOrder[0]);
    } else {
      expect(initializeWorkflowReworkData).not.toHaveBeenCalled();
    }
    expect(createWorkflowTasks).toHaveBeenCalledWith(
      expect.anything(),
      [1, 2, 3].map((reviewerSlot) =>
        expect.objectContaining({
          assignedUserId: [
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          ][reviewerSlot - 1],
          dueAt: new Date("2026-09-22T09:00:00.000Z"),
          reviewerSlot,
          stageInstanceId: stageId,
        }),
      ),
    );
    expect(set).toHaveBeenCalledWith({ currentStageInstanceId: stageId });
    expect(inserted).toEqual(
      expect.arrayContaining([
        {
          table: workflowEvents,
          value: expect.objectContaining({
            eventCode: "STAGE_ACTIVATED",
            payload: expect.objectContaining({
              joinDriven: true,
              taskIds: [taskId],
            }),
          }),
        },
        {
          table: workflowAuditEntries,
          value: expect.objectContaining({
            action: "STAGE_ACTIVATED",
            stageInstanceId: stageId,
            targetId: stageId,
            targetType: "WORKFLOW_STAGE_INSTANCE",
            workflowInstanceId: "33333333-3333-4333-8333-333333333333",
          }),
        },
      ]),
    );
    expect(inserted).toEqual(
      expect.arrayContaining([
        {
          table: workflowEvents,
          value: expect.objectContaining({
            eventCode: "PUBLIC_STATUS_CHANGED",
            payload: expect.objectContaining({ status: "UNDER_REVIEW" }),
          }),
        },
      ]),
    );
    const runtimeTaskAudit = inserted.find(
      (entry) =>
        entry.table === workflowAuditEntries && Array.isArray(entry.value),
    );
    expect(runtimeTaskAudit?.value).toEqual([
      expect.objectContaining({
        action: "TASK_CREATED",
        stageInstanceId: stageId,
        taskId,
        workflowInstanceId: "33333333-3333-4333-8333-333333333333",
      }),
      expect.objectContaining({
        action: "TASK_ASSIGNED",
        reason: "Configured task assignment",
        taskId,
      }),
    ]);
  });

  it("uses the exact application ruleset's generated verification form", async () => {
    const generatedFormVersionId = "99999999-9999-4999-8999-999999999999";
    const insert = vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }));
    const update = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })),
    }));
    const execute = vi.fn().mockResolvedValue({
      rows: [{ formVersionId: generatedFormVersionId }],
    });
    await persistStageActivation({ execute, insert, select, update } as never, {
      activatedAt,
      actorId: "77777777-7777-4777-8777-777777777777",
      correlationId: "88888888-8888-4888-8888-888888888888",
      iterationNumber: 1,
      target: {
        ...stageActivationTarget,
        eligibility: null,
        joinPredecessorStageKeys: [],
        slaHours: null,
      },
      tasks: [
        {
          formVersionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          id: "66666666-6666-4666-8666-666666666666",
          name: "Verify eligibility",
          namedUserOverrideId: null,
          roleId: "55555555-5555-4555-8555-555555555555",
          stableKey: "ELIGIBILITY_VERIFICATION",
          reviewerCount: 1,
          taskType: "CONTRIBUTING",
        },
      ],
    });

    expect(execute).toHaveBeenCalledOnce();
    expect(createWorkflowTasks).toHaveBeenCalledWith(expect.anything(), [
      expect.objectContaining({ formVersionId: generatedFormVersionId }),
    ]);
  });
});
