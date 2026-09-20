import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormEditor: vi.fn(),
  getFormRuntime: vi.fn(),
  getPublishedFormRuntime: vi.fn(),
  listForms: vi.fn(),
  listPublishedFormVersions: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormResponseRepository", () => ({
  readFormResponse: vi.fn(),
  saveDraftFormResponse: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(),
  readFormTaskCompletion: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormWriteRepository", () => ({
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

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import {
  getFormEditor,
  getFormRuntime,
  listForms,
} from "@/modules/forms/infrastructure/FormRepository";
import { saveFormDraft } from "@/modules/forms/infrastructure/FormWriteRepository";
import {
  readFormResponse,
  saveDraftFormResponse,
} from "@/modules/forms/infrastructure/FormResponseRepository";
import { readFormTaskCompletion } from "@/modules/forms/infrastructure/FormTaskCompletionRepository";
import {
  readAssignedFormTask,
  readWorkflowTask,
} from "@/db/repositories/WorkflowTaskRepository";
import {
  completeTaskForm,
  getTaskForm,
  getForms,
  saveTaskForm,
  updateFormDraft,
} from "@/modules/forms/application/ServerFormsService";
import { RequestValidationError } from "@/lib/resource-errors";
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
  sections: [],
  submitLabel: "Submit",
  versionId,
  versionNumber: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getFormRuntime).mockResolvedValue(runtime);
  vi.mocked(readFormResponse).mockResolvedValue(null as never);
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
    vi.mocked(saveDraftFormResponse).mockResolvedValue({
      id: "submission",
      rowVersion: 2,
    } as never);
    await saveTaskForm(staff([permissionCodes.workflowTaskAssignedProcess]), {
      expectedSubmissionRowVersion: 1,
      expectedTaskRowVersion: 3,
      taskInstanceId: taskId,
      values: {},
    });
    expect(saveDraftFormResponse).toHaveBeenCalledWith(expect.objectContaining({
      actorId,
      expectedSubmissionRowVersion: 1,
      formVersionId: versionId,
      taskInstanceId: taskId,
    }));
  });

  it("reloads a draft only for the task's exact Form Version", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    } as never);
    vi.mocked(readFormResponse).mockResolvedValue({
      completedAt: null,
      definitionSnapshot: null,
      formVersionId: versionId,
      id: "submission",
      rowVersion: 2,
      status: "DRAFT",
      values: { NOTES: "Resume here" },
    } as never);

    const result = await getTaskForm(
      staff([permissionCodes.workflowTaskAssignedRead]),
      taskId,
    );

    expect(readFormResponse).toHaveBeenCalledWith(taskId, versionId);
    expect(result.schema.versionId).toBe(versionId);
    expect(result.submission?.values).toEqual({ NOTES: "Resume here" });
  });

  it("persists partial values without requiring incomplete fields", async () => {
    vi.mocked(readAssignedFormTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    });
    vi.mocked(getFormRuntime).mockResolvedValue({
      ...runtime,
      fields: [{
        columnSpan: 1,
        key: "NOTES",
        label: "Notes",
        order: 1,
        required: true,
        sectionId: "20000000-0000-4000-8000-000000000001",
        type: "TEXTAREA",
      }],
    });
    vi.mocked(saveDraftFormResponse).mockResolvedValue({
      id: "submission",
      rowVersion: 1,
    } as never);

    await saveTaskForm(
      staff([permissionCodes.workflowTaskAssignedProcess]),
      {
        expectedTaskRowVersion: 3,
        taskInstanceId: taskId,
        values: {},
      },
    );

    expect(saveDraftFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({ values: {} }),
    );
  });

  it("does not persist runtime context as captured response values", async () => {
    vi.mocked(readAssignedFormTask).mockResolvedValue({
      formVersionId: versionId,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    });
    vi.mocked(getFormRuntime).mockResolvedValue({
      ...runtime,
      fields: [{
        columnSpan: 1,
        key: "RECOMMENDATION",
        label: "Recommendation",
        order: 1,
        required: false,
        sectionId: "20000000-0000-4000-8000-000000000001",
        type: "TEXTAREA",
      }],
    });

    await expect(saveTaskForm(
      staff([permissionCodes.workflowTaskAssignedProcess]),
      {
        expectedTaskRowVersion: 3,
        taskInstanceId: taskId,
        values: {
          "application.project_title": "Harbour expansion",
          RECOMMENDATION: "Proceed",
        },
      },
    )).rejects.toBeInstanceOf(RequestValidationError);
    expect(saveDraftFormResponse).not.toHaveBeenCalled();
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
      sections: [],
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

    await updateFormDraft(staff([permissionCodes.workflowFormUpdate]), taskId, {
      code: "UPDATED_FORM",
      description: "Updated description",
      expectedRowVersion: 1,
      fields: [],
      instructions: "Updated instructions",
      name: "Updated form",
      sections: [],
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
      actionKey: "ADVANCE",
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
    await expect(completeTaskForm(
      staff([permissionCodes.workflowTaskAssignedProcess]), {
      actionKey: "ADVANCE",
      correlationId: versionId,
      expectedTaskRowVersion: 3,
      idempotencyKey: versionId,
      taskInstanceId: taskId,
      values: {},
      },
    )).resolves.toEqual(result);
    expect(readAssignedFormTask).not.toHaveBeenCalled();
  });
});
