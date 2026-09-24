import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/db/client";
import { readWorkflowProgress } from "@/modules/workflows/infrastructure/WorkflowProgressRepository";

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
    stageStatus: "COMPLETED" as const,
    taskDueAt: new Date("2026-09-20T09:00:00Z"),
    taskId: "task-one",
    taskName: "Eligibility review",
    taskOrder: 1,
    taskStatus: "COMPLETED" as const,
    startedAt: new Date("2026-09-20T08:00:00Z"),
    terminalOutcome: null,
    versionMetadata: { code: "SME", name: "SME workflow", description: "" },
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
    stageStatus: "ACTIVE" as const,
    taskDueAt: null,
    taskId: "task-two",
    taskName: "Second eligibility review",
    taskOrder: 1,
    taskStatus: "PENDING" as const,
    startedAt: new Date("2026-09-20T08:00:00Z"),
    terminalOutcome: null,
    versionMetadata: { code: "SME", name: "SME workflow", description: "" },
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

    expect(progress?.name).toBe("SME workflow");
    expect(progress?.versionNumber).toBe(2);
    expect(progress?.stages.map((stage) => [stage.id, stage.iterationNumber, stage.status]))
      .toEqual([
        ["stage-run-one", 1, "COMPLETED"],
        ["stage-run-two", 2, "ACTIVE"],
      ]);
    expect(progress?.stages[0].completedAt).toBe("2026-09-20T10:00:00.000Z");
    expect(progress?.stages[0].tasks).toEqual([{
      dueAt: "2026-09-20T09:00:00.000Z",
      id: "task-one",
      name: "Eligibility review",
      status: "COMPLETED",
    }]);
    expect(select).toHaveBeenCalledWith(expect.objectContaining({
      iterationNumber: expect.anything(),
      stageId: expect.anything(),
      stageStatus: expect.anything(),
    }));
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
});
