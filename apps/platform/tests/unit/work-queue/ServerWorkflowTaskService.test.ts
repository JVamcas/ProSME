import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock("@/db/repositories/WorkflowTaskActionRepository", () => ({
  readChecklistTaskCompletion: vi.fn(),
  writeChecklistTaskCompletion: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readChecklistTaskCompletion,
  writeChecklistTaskCompletion,
} from "@/db/repositories/WorkflowTaskActionRepository";
import { readWorkflowTask } from "@/db/repositories/WorkflowTaskRepository";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  completeChecklistTask,
  getWorkflowTask,
} from "@/modules/work-queue/ServerWorkflowTaskService";

const actor: AuthenticatedUser = {
  capabilities: new Set([
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowTaskAssignedRead,
  ]),
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

const task = {
  actions: [{
    actionType: "APPROVE_ADVANCE" as const,
    key: "ADVANCE",
    label: "Advance",
  }],
  applicantName: "Applicant",
  applicationId: "79e20de0-3558-4d63-90a4-8c9f5125df08",
  businessName: "Business",
  config: {
    items: [{ code: "OWNERSHIP", label: "Ownership confirmed", required: true }],
  },
  dueAt: new Date("2026-09-20T08:00:00Z"),
  fundingCallTitle: "Funding call",
  reference: "SMEF-2026-000001",
  result: null,
  rowVersion: 2,
  stageName: "Pre-screening",
  taskInstanceId: "79e20de0-3558-4d63-90a4-8c9f5125df09",
  taskName: "Pre-screening checklist",
  taskStatus: "CLAIMED",
  taskType: "CHECKLIST",
};

const command = {
  correlationId: "79e20de0-3558-4d63-90a4-8c9f5125df10",
  idempotencyKey: "79e20de0-3558-4d63-90a4-8c9f5125df11",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowTask).mockResolvedValue(task);
  vi.mocked(readChecklistTaskCompletion).mockResolvedValue(null);
});

describe("workflow checklist task service", () => {
  it("returns only the configured checklist projection", async () => {
    const result = await getWorkflowTask(actor, task.taskInstanceId);
    expect(result).toMatchObject({
      checklistItems: task.config.items,
      dueAt: "2026-09-20T08:00:00.000Z",
      resultItems: [],
    });
    expect(result).not.toHaveProperty("config");
    expect(result).not.toHaveProperty("result");
  });

  it("requires every mandatory configured item", async () => {
    await expect(completeChecklistTask(
      actor,
      task.taskInstanceId,
      {
        actionKey: "ADVANCE",
        expectedRowVersion: 2,
        items: [{ accepted: false, code: "OWNERSHIP" }],
      },
      command,
    )).rejects.toBeInstanceOf(RequestValidationError);
    expect(writeChecklistTaskCompletion).not.toHaveBeenCalled();
  });

  it("completes valid decisions and returns idempotent results", async () => {
    const completion = {
      actionKey: "ADVANCE",
      nextStageName: "Completeness screening",
      rowVersion: 3,
      taskInstanceId: task.taskInstanceId,
      taskStatus: "COMPLETED" as const,
      workflowStatus: "ACTIVE" as const,
    };
    vi.mocked(writeChecklistTaskCompletion).mockResolvedValue({
      kind: "completed",
      result: completion,
    });
    const result = await completeChecklistTask(
      actor,
      task.taskInstanceId,
      {
        actionKey: "ADVANCE",
        expectedRowVersion: 2,
        items: [{ accepted: true, code: "OWNERSHIP" }],
      },
      command,
    );
    expect(result).toEqual(completion);
  });

  it("requires the assigned-task process permission", async () => {
    await expect(completeChecklistTask(
      { ...actor, capabilities: new Set() },
      task.taskInstanceId,
      { actionKey: "ADVANCE", expectedRowVersion: 2, items: [] },
      command,
    )).rejects.toBeInstanceOf(PermissionDeniedError);
  });
});
