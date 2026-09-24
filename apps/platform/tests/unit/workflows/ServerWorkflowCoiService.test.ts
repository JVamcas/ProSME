import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowCoiRepository", () => ({
  changeTaskCoi: vi.fn(),
  readTaskCoiGate: vi.fn(),
  readPendingTaskCoiDisclosure: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowReviewerReplacementRepository",
  () => ({ replaceWorkflowReviewer: vi.fn() }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  declareWorkflowTaskCoi,
  getWorkflowTaskCoi,
  getPendingWorkflowTaskCoiDisclosure,
  reviewWorkflowTaskCoi,
} from "@/modules/workflows/application/runtime/ServerWorkflowCoiService";
import {
  changeTaskCoi,
  readTaskCoiGate,
  readPendingTaskCoiDisclosure,
} from "@/modules/workflows/infrastructure/WorkflowCoiRepository";
import {
  replaceWorkflowReviewer,
} from "@/modules/workflows/infrastructure/WorkflowReviewerReplacementRepository";

const actor: AuthenticatedUser = {
  capabilities: new Set([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowCoiAllReview,
  ]),
  createdAt: new Date(),
  displayName: "Reviewer",
  email: "reviewer@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};
const taskId = "22222222-2222-4222-8222-222222222222";
const review = {
  taskId,
  expectedRowVersion: 2,
  decision: "RECUSE" as const,
  reason: "Confirmed potential conflict",
  replacementUserId: "33333333-3333-4333-8333-333333333333",
  correlationId: "44444444-4444-4444-8444-444444444444",
  idempotencyKey: "55555555-5555-4555-8555-555555555555",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("workflow COI service", () => {
  it("returns only assignment metadata before clearance", async () => {
    vi.mocked(readTaskCoiGate).mockResolvedValue({
      assignedUserId: actor.id,
      gated: true,
      rowVersion: 2,
      stageInstanceId: "66666666-6666-4666-8666-666666666666",
      state: "PENDING_REVIEW",
      status: "CLAIMED",
      taskId,
      taskName: "Independent review",
    });
    await expect(getWorkflowTaskCoi(actor, taskId)).resolves.toEqual({
      taskId,
      taskName: "Independent review",
      taskStatus: "CLAIMED",
      rowVersion: 2,
      gated: true,
      state: "PENDING_REVIEW",
      cleared: false,
    });
  });

  it("permits a no-conflict declaration on an assigned task", async () => {
    vi.mocked(changeTaskCoi).mockResolvedValue({
      state: "CLEARED_NO_CONFLICT",
    });
    await expect(declareWorkflowTaskCoi(actor, {
      taskId,
      expectedRowVersion: 2,
      decision: "NO_CONFLICT",
    })).resolves.toEqual({ state: "CLEARED_NO_CONFLICT" });
    expect(changeTaskCoi).toHaveBeenCalledWith(expect.objectContaining({
      actorId: actor.id,
      independentReview: false,
    }));
  });

  it("rejects disclosure without text", async () => {
    await expect(declareWorkflowTaskCoi(actor, {
      taskId,
      expectedRowVersion: 2,
      decision: "DISCLOSE",
      disclosureText: " ",
    })).rejects.toThrow("A disclosure is required.");
    expect(changeTaskCoi).not.toHaveBeenCalled();
  });

  it("shows disclosure only to a permitted independent reviewer", async () => {
    vi.mocked(readPendingTaskCoiDisclosure).mockResolvedValue({
      taskId,
      taskName: "Independent review",
      rowVersion: 2,
      subjectUserId: "99999999-9999-4999-8999-999999999999",
      disclosureText: "Potential relationship",
    });
    await expect(getPendingWorkflowTaskCoiDisclosure(actor, taskId))
      .resolves.toMatchObject({
        disclosureText: "Potential relationship",
      });
    const limited = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    };
    await expect(getPendingWorkflowTaskCoiDisclosure(limited, taskId))
      .rejects.toThrow();
  });

  it("requires independent review permission", async () => {
    const limited = {
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAssignedProcess]),
    };
    await expect(reviewWorkflowTaskCoi(limited, review)).rejects.toThrow();
    expect(replaceWorkflowReviewer).not.toHaveBeenCalled();
  });

  it("reuses the replacement command for confirmed recusal", async () => {
    vi.mocked(replaceWorkflowReviewer).mockResolvedValue({
      taskId: "77777777-7777-4777-8777-777777777777",
      replacedTaskId: taskId,
      reviewerSlot: 1,
    });
    await expect(reviewWorkflowTaskCoi(actor, review)).resolves.toEqual({
      state: "RECUSED",
      replacementTaskId: "77777777-7777-4777-8777-777777777777",
    });
    expect(replaceWorkflowReviewer).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        coiDecision: "RECUSE",
        replacementUserId: review.replacementUserId,
      }),
    );
  });

  it("rejects a stale or self-reviewed disclosure", async () => {
    vi.mocked(changeTaskCoi).mockResolvedValue(null);
    await expect(reviewWorkflowTaskCoi(actor, {
      ...review,
      decision: "CLEAR",
    })).rejects.toThrow("COI state or task changed");
  });
});

