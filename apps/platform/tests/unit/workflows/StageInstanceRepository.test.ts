import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createStageInstance } from "@/modules/workflows/infrastructure/StageInstanceRepository";

const activatedAt = new Date("2026-09-21T09:00:00.000Z");
const record = {
  activatedAt,
  completedAt: null,
  id: "41111111-1111-4111-8111-111111111111",
  iterationNumber: 2,
  referralContext: { referredByStageInstanceId: "source-stage" },
  returnContext: null,
  status: "ACTIVE" as const,
  workflowInstanceId: "42222222-2222-4222-8222-222222222222",
  workflowStageDefinitionId: "43333333-3333-4333-8333-333333333333",
};

const returning = vi.fn();
const values = vi.fn(() => ({ returning }));
const insert = vi.fn(() => ({ values }));

beforeEach(() => {
  vi.clearAllMocks();
  returning.mockResolvedValue([record]);
});

describe("stage instance repository", () => {
  it("persists an independent repeatable stage iteration", async () => {
    const result = await createStageInstance(
      { insert } as never,
      {
        activatedAt,
        iterationNumber: 2,
        referralContext: record.referralContext,
        workflowInstanceId: record.workflowInstanceId,
        workflowStageDefinitionId: record.workflowStageDefinitionId,
      },
    );

    expect(values).toHaveBeenCalledWith({
      activatedAt,
      iterationNumber: 2,
      referralContext: record.referralContext,
      returnContext: null,
      workflowInstanceId: record.workflowInstanceId,
      workflowStageDefinitionId: record.workflowStageDefinitionId,
    });
    expect(result).toEqual(record);
  });
});
