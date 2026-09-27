import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection",
  () => ({ withWorkflowActionExecutionTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRfiCorrespondenceRepository",
  () => ({
    addAssignedWorkflowRfiFollowUp: vi.fn(),
    saveOwnedWorkflowRfiDraft: vi.fn(),
  }),
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
  addWorkflowRfiFollowUp,
  closeWorkflowRfi,
  respondToWorkflowRfi,
  saveWorkflowRfiDraft,
} from "@/modules/workflows/application/runtime/ServerWorkflowRfiService";
import { withWorkflowActionExecutionTransaction } from "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection";
import {
  addAssignedWorkflowRfiFollowUp,
  saveOwnedWorkflowRfiDraft,
} from "@/modules/workflows/infrastructure/WorkflowRfiCorrespondenceRepository";
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

  it("saves an applicant draft only with own-respond permission", async () => {
    vi.mocked(saveOwnedWorkflowRfiDraft).mockResolvedValue({
      rowVersion: 1,
      updatedAt: "2026-09-27T10:00:00.000Z",
    });
    await saveWorkflowRfiDraft(
      user("funding.application.information-request.own.respond"),
      {
        expectedRowVersion: 0,
        fieldValues: { "application.turnover": 125_000 },
        requestInformationId,
      },
    );
    expect(saveOwnedWorkflowRfiDraft).toHaveBeenCalledWith(
      {},
      actorId,
      expect.objectContaining({ requestInformationId }),
    );
  });

  it("denies draft saving without own-respond permission", () => {
    expect(() => saveWorkflowRfiDraft(user(), {
      expectedRowVersion: 0,
      fieldValues: {},
      requestInformationId,
    })).toThrow();
    expect(saveOwnedWorkflowRfiDraft).not.toHaveBeenCalled();
  });

  it("adds a follow-up only with the canonical create permission", async () => {
    vi.mocked(addAssignedWorkflowRfiFollowUp).mockResolvedValue({
      correspondenceId: "50000000-0000-4000-8000-000000000001",
    });
    await addWorkflowRfiFollowUp(
      user("funding.application.information-request.create"),
      "60000000-0000-4000-8000-000000000001",
      {
        correlationId,
        message: "Please upload the signed version.",
        requestInformationId,
      },
    );
    expect(addAssignedWorkflowRfiFollowUp).toHaveBeenCalledWith(
      {},
      actorId,
      expect.objectContaining({
        requestInformationId,
        taskId: "60000000-0000-4000-8000-000000000001",
      }),
    );
  });

  it("denies a follow-up without the canonical create permission", () => {
    expect(() => addWorkflowRfiFollowUp(
      user(),
      "60000000-0000-4000-8000-000000000001",
      {
        correlationId,
        message: "Please upload the signed version.",
        requestInformationId,
      },
    )).toThrow();
    expect(addAssignedWorkflowRfiFollowUp).not.toHaveBeenCalled();
  });
});
