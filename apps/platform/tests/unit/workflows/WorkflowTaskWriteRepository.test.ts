import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createWorkflowTasks } from "@/modules/workflows/infrastructure/WorkflowTaskWriteRepository";

const createdAt = new Date("2026-09-21T09:05:00.000Z");
const dueAt = new Date("2026-09-23T09:05:00.000Z");
const record = {
  assignedRoleId: "51111111-1111-4111-8111-111111111111",
  assignedUserId: "52222222-2222-4222-8222-222222222222",
  claimedAt: createdAt,
  completedAt: null,
  createdAt,
  dueAt,
  formVersionId: null,
  id: "53333333-3333-4333-8333-333333333333",
  rowVersion: 1,
  stageInstanceId: "54444444-4444-4444-8444-444444444444",
  startedAt: null,
  status: "CLAIMED" as const,
  workflowTaskDefinitionId: "55555555-5555-4555-8555-555555555555",
};

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));

beforeEach(() => {
  vi.clearAllMocks();
  returning.mockResolvedValue([record]);
});

describe("workflow task write repository", () => {
  it("persists runtime tasks independently from their definitions", async () => {
    const result = await createWorkflowTasks(
      { insert } as never,
      [{
        assignedRoleId: record.assignedRoleId,
        assignedUserId: record.assignedUserId,
        createdAt,
        dueAt,
        stageInstanceId: record.stageInstanceId,
        reviewerSlot: 1,
    workflowTaskDefinitionId: record.workflowTaskDefinitionId,
      }],
    );

    expect(values).toHaveBeenCalledWith([{
      assignedRoleId: record.assignedRoleId,
      assignedUserId: record.assignedUserId,
      claimedAt: createdAt,
      createdAt,
      dueAt,
      formVersionId: null,
      stageInstanceId: record.stageInstanceId,
      status: "CLAIMED",
      workflowTaskDefinitionId: record.workflowTaskDefinitionId,
      reviewerSlot: 1,
    }]);
    expect(result).toEqual([record]);
  });

  it("does not issue an insert for an empty task list", async () => {
    await expect(createWorkflowTasks({ insert } as never, []))
      .resolves.toEqual([]);
    expect(insert).not.toHaveBeenCalled();
  });
});
