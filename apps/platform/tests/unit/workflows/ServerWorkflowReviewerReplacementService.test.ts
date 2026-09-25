import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowReviewerReplacementRepository",
  () => ({ replaceWorkflowReviewer: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  replaceReviewer,
} from "@/modules/workflows/application/runtime/ServerWorkflowReviewerReplacementService";
import {
  replaceWorkflowReviewer,
} from "@/modules/workflows/infrastructure/WorkflowReviewerReplacementRepository";

const input = {
  correlationId: "10000000-0000-4000-8000-000000000001",
  expectedRowVersion: 2,
  idempotencyKey: "20000000-0000-4000-8000-000000000001",
  reason: "Reviewer is unavailable.",
  replacementUserId: "30000000-0000-4000-8000-000000000001",
  taskId: "40000000-0000-4000-8000-000000000001",
};
const actor = {
  capabilities: new Set([permissionCodes.workflowTaskReassign]),
  id: "50000000-0000-4000-8000-000000000001",
  status: "active",
} as unknown as AuthenticatedUser;

beforeEach(() => vi.clearAllMocks());

describe("reviewer replacement authorization", () => {
  it("attributes an eligible replacement to the allocator", async () => {
    vi.mocked(replaceWorkflowReviewer).mockResolvedValue({
      replacedTaskId: input.taskId,
      reviewerSlot: 2,
      taskId: "60000000-0000-4000-8000-000000000001",
    });
    await expect(replaceReviewer(actor, input)).resolves.toMatchObject({
      reviewerSlot: 2,
      replacedTaskId: input.taskId,
    });
    expect(replaceWorkflowReviewer).toHaveBeenCalledWith({
      ...input,
      actorId: actor.id,
    });
  });

  it("denies actors without the canonical reassign permission", async () => {
    await expect(replaceReviewer({
      ...actor,
      capabilities: new Set(),
    }, input)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(replaceWorkflowReviewer).not.toHaveBeenCalled();
  });

  it("rejects stale or ineligible replacements", async () => {
    vi.mocked(replaceWorkflowReviewer).mockResolvedValue(null);
    await expect(replaceReviewer(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
  });
});
