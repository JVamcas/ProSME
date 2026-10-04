import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository",
  () => ({ writeTaskReviewDraft: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskActionRepository",
  () => ({
    readChecklistTaskCompletion: vi.fn(),
    writeChecklistTaskCompletion: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { saveTaskReviewDraft } from "@/modules/work-queue/application/ServerWorkflowTaskService";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { writeTaskReviewDraft } from "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository";
import { workflowTaskServiceFixture } from "../../support/WorkflowTaskServiceFixture";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedProcess]),
  createdAt: new Date(),
  displayName: "Reviewer",
  email: "reviewer@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

describe("workflow task draft patches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readWorkflowTask).mockResolvedValue({
      ...workflowTaskServiceFixture,
      documentRequirements: [{
        acceptedFileTypes: ["PDF"],
        expiryDays: null,
        mandatory: true,
        maximumSizeMb: 20,
        name: "Committee pack",
        requestStatus: "MISSING",
        stableKey: "COMMITTEE_PACK",
        templateReference: "",
        uploader: "STAFF",
        verifier: "STAFF",
      }],
    });
    vi.mocked(writeTaskReviewDraft).mockResolvedValue(true);
  });

  it("saves one checklist item without unrelated document entries", async () => {
    const patch = {
      items: [{ accepted: true, code: "OWNERSHIP" }],
    };

    await expect(saveTaskReviewDraft(
      actor,
      workflowTaskServiceFixture.taskInstanceId,
      patch,
      "79e20de0-3558-4d63-90a4-8c9f5125df10",
    )).resolves.toEqual({ saved: true });
    expect(writeTaskReviewDraft).toHaveBeenCalledWith(
      expect.objectContaining(patch),
    );
  });

  it("accepts comment, document, and score patches independently", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue({
      ...workflowTaskServiceFixture,
      config: {
        commentFields: [{
          displayOrder: 1,
          helpText: "",
          key: "recommendation",
          label: "Recommendation",
          mandatory: false,
        }],
      },
      documentRequirements: [{
        acceptedFileTypes: ["PDF"],
        expiryDays: null,
        mandatory: true,
        maximumSizeMb: 20,
        name: "Committee pack",
        requestStatus: "SUPPLIED",
        stableKey: "COMMITTEE_PACK",
        templateReference: "",
        uploader: "STAFF",
        verifier: "STAFF",
      }],
      scoring: {
        aggregation: "SUM",
        criteria: [{
          criterion: "Impact",
          description: "",
          mandatoryComment: false,
          scaleMaximum: 5,
          scaleMinimum: 1,
          stableKey: "IMPACT",
          weight: 1,
        }],
      },
    });

    const patches = [
      { comments: [{ key: "recommendation", value: "Approve" }] },
      {
        documents: [{
          category: "COMMITTEE_PACK",
          outcome: "VERIFIED" as const,
        }],
      },
      { scores: [{ criterion: "IMPACT", score: 4 }] },
    ];
    for (const patch of patches) {
      await expect(saveTaskReviewDraft(
        actor,
        workflowTaskServiceFixture.taskInstanceId,
        patch,
        "79e20de0-3558-4d63-90a4-8c9f5125df10",
      )).resolves.toEqual({ saved: true });
    }
    expect(writeTaskReviewDraft).toHaveBeenCalledTimes(3);
  });
});
