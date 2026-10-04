import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskActionRepository",
  () => ({
    readChecklistTaskCompletion: vi.fn(),
    writeChecklistTaskCompletion: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { completeChecklistTask } from "@/modules/work-queue/application/ServerWorkflowTaskService";
import {
  readChecklistTaskCompletion,
  writeChecklistTaskCompletion,
} from "@/modules/workflows/infrastructure/WorkflowTaskActionRepository";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
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

const task = workflowTaskServiceFixture;
const command = {
  correlationId: "79e20de0-3558-4d63-90a4-8c9f5125df10",
  idempotencyKey: "79e20de0-3558-4d63-90a4-8c9f5125df11",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readChecklistTaskCompletion).mockResolvedValue(null);
  vi.mocked(readWorkflowTask).mockResolvedValue({
    ...task,
    checklistItems: [],
    documentRequirements: [
      {
        acceptedFileTypes: ["PDF"],
        expiryDays: null,
        mandatory: true,
        maximumSizeMb: 20,
        name: "Award or regret letter",
        stableKey: "AWARD_OR_REGRET_LETTER",
        requestStatus: "SUPPLIED",
        templateReference: "",
        uploader: "STAFF",
        verifier: "STAFF",
        document: {
          contentType: "application/pdf",
          fileName: "award.pdf",
          sizeBytes: 512,
          uploadedAt: "2026-09-28T08:00:00.000Z",
          versionId: "79e20de0-3558-4d63-90a4-8c9f5125df13",
          versionNumber: 1,
        },
      },
      {
        acceptedFileTypes: ["PDF"],
        expiryDays: null,
        mandatory: false,
        maximumSizeMb: 20,
        name: "Appeal submission",
        stableKey: "APPEAL_SUBMISSION",
        requestStatus: "MISSING",
        templateReference: "",
        uploader: "APPLICANT",
        verifier: "STAFF",
        document: null,
      },
    ],
  });
  vi.mocked(writeChecklistTaskCompletion).mockResolvedValue({
    kind: "completed",
    result: {
      actionKey: null,
      nextStageName: null,
      rowVersion: 3,
      taskInstanceId: task.taskInstanceId,
      taskStatus: "COMPLETED",
      workflowStatus: "ACTIVE",
    },
  });
});

describe("workflow task document validation", () => {
  it("does not require verification for optional evidence that is absent", async () => {
    await expect(
      completeChecklistTask(
        actor,
        task.taskInstanceId,
        {
          documents: [{
            category: "AWARD_OR_REGRET_LETTER",
            comment: "",
            outcome: "",
          }],
          expectedRowVersion: 2,
          items: [],
        },
        command,
      ),
    ).resolves.toMatchObject({ taskStatus: "COMPLETED" });
  });
});
