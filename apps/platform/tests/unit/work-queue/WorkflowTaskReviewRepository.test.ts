import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/workflows/infrastructure/WorkflowRuntimeLock", () => ({
  lockWorkflowRuntimeForTask: vi.fn(),
  lockWorkflowRuntimeForStage: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  getDatabase: vi.fn(),
}));

import { getDatabase } from "@/db/client";
import {
  mergeTaskReviewDraft,
  writeTaskReviewDraft,
} from "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository";

const input = {
  actorId: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  comments: [{ key: "recommendation", value: "Ready" }],
  correlationId: "79e20de0-3558-4d63-90a4-8c9f5125df10",
  items: [{ accepted: true, code: "OWNERSHIP" }],
  taskId: "79e20de0-3558-4d63-90a4-8c9f5125df09",
};

const execute = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getDatabase).mockReturnValue({
    transaction: (callback: (transaction: { execute: typeof execute }) => unknown) =>
      callback({ execute }),
  } as never);
});

describe("review draft repository", () => {
  it("merges changed entries without replacing unrelated task results", () => {
    const result = mergeTaskReviewDraft(
      {
        documents: [{ category: "COMMITTEE_PACK", outcome: "VERIFIED" }],
        items: [
          { accepted: false, code: "QUORUM" },
          { accepted: true, code: "BUDGET" },
        ],
        values: { resolutionNumber: "RES-100" },
      },
      { items: [{ accepted: true, code: "QUORUM" }] },
    );

    expect(result).toEqual({
      documents: [{ category: "COMMITTEE_PACK", outcome: "VERIFIED" }],
      items: [
        { accepted: true, code: "QUORUM" },
        { accepted: true, code: "BUDGET" },
      ],
      values: { resolutionNumber: "RES-100" },
    });
  });

  it("does not write when the assigned active task cannot be locked", async () => {
    execute.mockResolvedValueOnce({ rows: [] });
    await expect(writeTaskReviewDraft(input)).resolves.toBe(false);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("writes the draft and audit record in one transaction", async () => {
    execute.mockResolvedValueOnce({
      rows: [{
        result: null,
        stageInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df12",
        workflowInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df13",
      }],
    });
    execute.mockResolvedValue({ rows: [] });
    await expect(writeTaskReviewDraft(input)).resolves.toBe(true);
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
