import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiRepository";
import type { CreateWorkflowRfiRequest } from "@/modules/workflows/domain/runtime/WorkflowRfi";

const request = {
  applicationId: "application",
  requesterId: "reviewer",
  idempotencyKey: "request-key",
  source: {
    taskId: "task",
    stageInstanceId: "stage",
    stageDefinitionId: "stage-definition",
    workflowInstanceId: "workflow",
    workflowVersionId: "version",
    actionDefinitionId: "action",
  },
} as CreateWorkflowRfiRequest;

beforeEach(() => vi.clearAllMocks());

function transaction(rows: unknown[][]) {
  const limit = vi.fn().mockImplementation(async () => rows.shift());
  const chain = {
    from: vi.fn(),
    innerJoin: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit,
  };
  for (const key of ["from", "innerJoin", "where", "for"] as const) {
    chain[key].mockReturnValue(chain);
  }
  return { select: vi.fn(() => chain), insert: vi.fn(), chain };
}

describe("RFI creation guard", () => {
  it("rejects a second open request after locking the task and before inserting records", async () => {
    const database = transaction([
      [],
      [{ recipientUserId: "applicant", taskDefinitionId: "definition" }],
      [{ id: "existing-open-request" }],
    ]);
    await expect(createWorkflowRfi(database as never, request)).rejects.toThrow(
      "This task already has an open information request",
    );
    expect(database.chain.for).toHaveBeenCalledWith(
      "update",
      expect.anything(),
    );
    expect(database.chain.limit).toHaveBeenCalledTimes(3);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it("preserves idempotent replay of the original request", async () => {
    const deadlineAt = new Date("2026-10-12T10:00:00Z");
    const database = transaction([
      [
        {
          id: "original-request",
          taskId: "task",
          requesterId: "reviewer",
          deadlineAt,
        },
      ],
    ]);
    await expect(
      createWorkflowRfi(database as never, request),
    ).resolves.toEqual({
      deadlineAt,
      requestInformationId: "original-request",
      status: "OPEN",
    });
    expect(database.chain.for).not.toHaveBeenCalled();
    expect(database.insert).not.toHaveBeenCalled();
  });
});
