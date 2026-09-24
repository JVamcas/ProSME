import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(),
  readFormTaskCompletion: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { completeTaskForm } from "@/modules/forms/application/ServerFormsService";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import {
  completeFormTask as writeFormTaskCompletion,
  readFormTaskCompletion,
} from "@/modules/forms/infrastructure/FormTaskCompletionRepository";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { readAssignedFormTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedDecide]),
  createdAt: new Date(),
  displayName: "Forms User",
  email: "forms@example.test",
  id: actorId,
  identitySubject: "firebase-subject",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFormTaskCompletion).mockResolvedValue(null);
  vi.mocked(readAssignedFormTask).mockResolvedValue({
    formVersionId: versionId,
    permissions: defaultWorkflowElementPermissions,
    rowVersion: 3,
    taskInstanceId: taskId,
    taskStatus: "IN_PROGRESS",
  });
  vi.mocked(getFormRuntime).mockResolvedValue({
    fields: [],
    instructions: null,
    sections: [],
    submitLabel: "Complete task",
    versionId,
    versionNumber: 1,
  });
  vi.mocked(writeFormTaskCompletion).mockResolvedValue({
    kind: "completed",
    result: {
      actionKey: null,
      nextStageName: null,
      rowVersion: 4,
      taskInstanceId: taskId,
      taskStatus: "COMPLETED",
      workflowStatus: "ACTIVE",
    },
  });
});

describe("form task completion without workflow actions", () => {
  it("completes the task without attempting a stage action", async () => {
    await completeTaskForm(actor, {
      actionKey: null,
      correlationId: versionId,
      expectedTaskRowVersion: 3,
      idempotencyKey: versionId,
      taskInstanceId: taskId,
      values: {},
    });

    expect(writeFormTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ actionKey: null }),
      expect.any(Function),
    );
  });
});
