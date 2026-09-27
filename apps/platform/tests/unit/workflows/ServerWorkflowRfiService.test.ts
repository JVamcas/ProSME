import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection",
  () => ({ withWorkflowActionExecutionTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRfiLifecycleRepository",
  () => ({
    closeAssignedWorkflowRfi: vi.fn(),
    respondToOwnedWorkflowRfi: vi.fn(),
  }),
);

import type { AuthenticatedUser } from "@/auth/types";
import {
  closeWorkflowRfi,
  respondToWorkflowRfi,
} from "@/modules/workflows/application/runtime/ServerWorkflowRfiService";
import { withWorkflowActionExecutionTransaction } from "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection";
import {
  closeAssignedWorkflowRfi,
  respondToOwnedWorkflowRfi,
} from "@/modules/workflows/infrastructure/WorkflowRfiLifecycleRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const requestInformationId = "20000000-0000-4000-8000-000000000001";
const correlationId = "30000000-0000-4000-8000-000000000001";
const idempotencyKey = "40000000-0000-4000-8000-000000000001";

function user(...permissions: string[]) {
  return {
    capabilities: new Set(permissions),
    id: actorId,
    status: "active",
  } as unknown as AuthenticatedUser;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withWorkflowActionExecutionTransaction).mockImplementation(
    async (work) => work({} as never),
  );
});

describe("ServerWorkflowRfiService", () => {
  it("allows an own response only with the canonical own-respond permission", async () => {
    vi.mocked(respondToOwnedWorkflowRfi).mockResolvedValue({
      requestInformationId,
      responseId: "50000000-0000-4000-8000-000000000001",
      rowVersion: 2,
      status: "RESPONDED",
    });
    await respondToWorkflowRfi(
      user("funding.application.information-request.own.respond"),
      {
        correlationId,
        evidenceVersionIds: [],
        expectedRowVersion: 1,
        fieldValues: {},
        idempotencyKey,
        requestInformationId,
      },
    );
    expect(respondToOwnedWorkflowRfi).toHaveBeenCalledWith(
      {},
      actorId,
      expect.objectContaining({ requestInformationId }),
    );
  });

  it("denies a response without the canonical permission", () => {
    expect(() => respondToWorkflowRfi(user(), {
      correlationId,
      evidenceVersionIds: [],
      expectedRowVersion: 1,
      fieldValues: {},
      idempotencyKey,
      requestInformationId,
    })).toThrow();
    expect(respondToOwnedWorkflowRfi).not.toHaveBeenCalled();
  });

  it("does not mask an assigned-task context mismatch", async () => {
    vi.mocked(closeAssignedWorkflowRfi).mockRejectedValue(
      new Error("assigned information request not found"),
    );
    await expect(closeWorkflowRfi(
      user("funding.application.information-request.assigned.close"),
      {
        correlationId,
        expectedRowVersion: 1,
        requestInformationId,
      },
    )).rejects.toThrow("assigned information request not found");
  });
});
