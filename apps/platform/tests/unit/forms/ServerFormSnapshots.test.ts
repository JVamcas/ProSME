import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormResponseRepository", () => ({
  readFormResponse: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(),
  readFormTaskCompletion: vi.fn(),
}));
vi.mock("@/db/repositories/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
  readWorkflowTask: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  completeTaskForm,
  getTaskForm,
} from "@/modules/forms/application/ServerFormsService";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { readFormResponse } from "@/modules/forms/infrastructure/FormResponseRepository";
import {
  completeFormTask as writeFormTaskCompletion,
  readFormTaskCompletion,
} from "@/modules/forms/infrastructure/FormTaskCompletionRepository";
import {
  readAssignedFormTask,
  readWorkflowTask,
} from "@/db/repositories/WorkflowTaskRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";
const runtime = {
  fields: [{
    columnSpan: 1 as const,
    key: "NOTES",
    label: "Notes",
    order: 1,
    required: true,
    sectionId: "20000000-0000-4000-8000-000000000001",
    type: "TEXTAREA" as const,
  }],
  instructions: "Complete this form.",
  sections: [],
  submitLabel: "Submit",
  versionId,
  versionNumber: 1,
};

function staff(permission: string): AuthenticatedUser {
  return {
    capabilities: new Set([permission]),
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
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readFormTaskCompletion).mockResolvedValue(null);
});

describe("submitted form snapshots", () => {
  it("lodges the exact form version, definition and submitted values", async () => {
    const values = { NOTES: "Final answer" };
    vi.mocked(readAssignedFormTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    });
    vi.mocked(getFormRuntime).mockResolvedValue(runtime);
    vi.mocked(writeFormTaskCompletion).mockResolvedValue({
      kind: "completed",
      result: {
        nextStageName: null,
        rowVersion: 4,
        taskInstanceId: taskId,
        taskStatus: "COMPLETED",
        workflowStatus: "ACTIVE",
      },
    });

    await completeTaskForm(
      staff(permissionCodes.workflowTaskAssignedProcess),
      {
        correlationId: versionId,
        expectedTaskRowVersion: 3,
        idempotencyKey: versionId,
        taskInstanceId: taskId,
        values,
      },
    );

    expect(writeFormTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionSnapshot: runtime,
        formVersionId: versionId,
        values,
      }),
    );
  });

  it("reproduces a completed response from its lodged snapshot", async () => {
    const lodgedSchema = {
      ...runtime,
      instructions: "Instructions at submission time",
    };
    vi.mocked(readWorkflowTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 4,
      taskInstanceId: taskId,
      taskStatus: "COMPLETED",
    } as never);
    vi.mocked(getFormRuntime).mockResolvedValue({
      ...runtime,
      instructions: "Current definition",
    });
    vi.mocked(readFormResponse).mockResolvedValue({
      completedAt: new Date("2026-09-19T12:00:00Z"),
      definitionSnapshot: lodgedSchema,
      formVersionId: versionId,
      id: "submission",
      rowVersion: 2,
      status: "COMPLETED",
      values: { NOTES: "Lodged answer" },
    } as never);

    const result = await getTaskForm(
      staff(permissionCodes.workflowTaskAssignedRead),
      taskId,
    );

    expect(result.schema).toEqual(lodgedSchema);
    expect(result.submission?.values).toEqual({ NOTES: "Lodged answer" });
  });
});
