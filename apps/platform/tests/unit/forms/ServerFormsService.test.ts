import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db/repositories/FormRepository", () => ({
  getFormEditor: vi.fn(),
  getFormRuntime: vi.fn(),
  getPublishedFormRuntime: vi.fn(),
  getSubmission: vi.fn(),
  listForms: vi.fn(),
  listPublishedFormVersions: vi.fn(),
}));
vi.mock("@/db/repositories/FormSubmissionRepository", () => ({
  saveSubmission: vi.fn(),
}));
vi.mock("@/db/repositories/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(),
  readFormTaskCompletion: vi.fn(),
}));
vi.mock("@/db/repositories/FormWriteRepository", () => ({
  cloneFormVersion: vi.fn(),
  createForm: vi.fn(),
  publishFormVersion: vi.fn(),
  retireFormVersion: vi.fn(),
  saveFormDraft: vi.fn(),
}));
vi.mock("@/db/repositories/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
  readWorkflowTask: vi.fn(),
}));

import { capabilities } from "@/auth/authorization/capabilities";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  getFormEditor,
  getFormRuntime,
  getSubmission,
  listForms,
} from "@/db/repositories/FormRepository";
import { saveFormDraft } from "@/db/repositories/FormWriteRepository";
import { saveSubmission } from "@/db/repositories/FormSubmissionRepository";
import { readFormTaskCompletion } from "@/db/repositories/FormTaskCompletionRepository";
import { readAssignedFormTask } from "@/db/repositories/WorkflowTaskRepository";
import {
  completeTaskForm,
  getForms,
  saveTaskForm,
  updateFormDraft,
} from "@/modules/forms/ServerFormsService";
import type { AuthenticatedUser } from "@/auth/types";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";

function staff(granted: string[]): AuthenticatedUser {
  return {
    capabilities: new Set(granted),
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

const runtime = {
  fields: [],
  instructions: null,
  submitLabel: "Submit",
  versionId,
  versionNumber: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFormRuntime).mockResolvedValue(runtime);
  vi.mocked(getSubmission).mockResolvedValue(null as never);
});

describe("ServerFormsService", () => {
  it("checks capability before reading an assigned task", async () => {
    await expect(getForms(staff([]))).rejects.toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(listForms).not.toHaveBeenCalled();
  });

  it("derives the pinned version and actor scope for draft saves", async () => {
    vi.mocked(readAssignedFormTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    });
    vi.mocked(saveSubmission).mockResolvedValue({
      id: "submission",
      rowVersion: 2,
    } as never);
    await saveTaskForm(staff([capabilities.workflowTaskComplete]), {
      expectedSubmissionRowVersion: 1,
      expectedTaskRowVersion: 3,
      taskInstanceId: taskId,
      values: {},
    });
    expect(saveSubmission).toHaveBeenCalledWith(expect.objectContaining({
      actorId,
      expectedSubmissionRowVersion: 1,
      formVersionId: versionId,
      taskInstanceId: taskId,
    }));
  });

  it("updates definition and version settings together", async () => {
    vi.mocked(saveFormDraft).mockResolvedValue({ id: versionId } as never);
    vi.mocked(getFormEditor).mockResolvedValue({
      definition: {
        active: true,
        code: "UPDATED_FORM",
        createdAt: new Date(),
        description: "Updated description",
        id: taskId,
        name: "Updated form",
        updatedAt: new Date(),
      },
      fields: [],
      version: {
        createdAt: new Date(),
        formDefinitionId: taskId,
        id: versionId,
        instructions: "Updated instructions",
        publishedAt: null,
        retiredAt: null,
        rowVersion: 2,
        status: "DRAFT",
        submitLabel: "Complete",
        updatedAt: new Date(),
        versionNumber: 1,
      },
      versions: [],
    } as never);

    await updateFormDraft(staff([capabilities.formUpdate]), taskId, {
      code: "UPDATED_FORM",
      description: "Updated description",
      expectedRowVersion: 1,
      fields: [],
      instructions: "Updated instructions",
      name: "Updated form",
      submitLabel: "Complete",
    });

    expect(saveFormDraft).toHaveBeenCalledWith(expect.objectContaining({
      actorId,
      code: "UPDATED_FORM",
      definitionId: taskId,
      instructions: "Updated instructions",
      submitLabel: "Complete",
    }));
  });

  it("returns a completion replay before requiring the task to remain active", async () => {
    const result = {
      nextStageName: "Finance",
      rowVersion: 4,
      taskInstanceId: taskId,
      taskStatus: "COMPLETED" as const,
      workflowStatus: "ACTIVE" as const,
    };
    vi.mocked(readFormTaskCompletion).mockResolvedValue({
      kind: "completed",
      result,
    });
    await expect(completeTaskForm(staff([capabilities.workflowTaskComplete]), {
      correlationId: versionId,
      expectedTaskRowVersion: 3,
      idempotencyKey: versionId,
      taskInstanceId: taskId,
      values: {},
    })).resolves.toEqual(result);
    expect(readAssignedFormTask).not.toHaveBeenCalled();
  });
});
