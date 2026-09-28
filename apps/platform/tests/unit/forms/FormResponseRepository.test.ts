import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { saveDraftInTransaction } from "@/modules/forms/infrastructure/FormResponseRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const formVersionId = "79e20de0-3558-4d63-90a4-8c9f5125df08";
const workflowTaskId = "79e20de0-3558-4d63-90a4-8c9f5125df09";

const limit = vi.fn();
const updateSet = vi.fn();

function transaction() {
  let insertCount = 0;
  return {
    insert: vi.fn(() => {
      insertCount += 1;
      if (insertCount === 1) {
        return {
          values: vi.fn(() => ({
            onConflictDoNothing: vi.fn(() => ({
              returning: vi.fn(async () => [{
                completedAt: null,
                createdAt: new Date(),
                createdBy: actorId,
                definitionSnapshot: null,
                formVersionId,
                id: "79e20de0-3558-4d63-90a4-8c9f5125df10",
                respondentUserId: actorId,
                rowVersion: 1,
                status: "DRAFT",
                updatedAt: new Date(),
                updatedBy: actorId,
                values: { NOTES: "Started" },
                workflowTaskId,
              }]),
            })),
          })),
        };
      }
      return { values: vi.fn() };
    }),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          for: vi.fn(() => ({ limit })),
        })),
      })),
    })),
    update: vi.fn(() => ({
      set: updateSet,
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  limit
    .mockResolvedValueOnce([{
      assignedUserId: actorId,
      formVersionId,
      rowVersion: 4,
      status: "PENDING",
    }])
    .mockResolvedValueOnce([]);
  updateSet.mockReturnValue({ where: vi.fn() });
});

describe("form response repository", () => {
  it("starts a pending task after its first form draft is saved", async () => {
    const database = transaction();

    const response = await saveDraftInTransaction(database as never, {
      actorId,
      correlationId: "79e20de0-3558-4d63-90a4-8c9f5125df11",
      expectedTaskRowVersion: 4,
      formVersionId,
      values: { NOTES: "Started" },
      workflowTaskId,
    });

    expect(response).toEqual(expect.objectContaining({ status: "DRAFT" }));
    expect(updateSet).toHaveBeenCalledWith(expect.objectContaining({
      status: "IN_PROGRESS",
    }));
  });
});
