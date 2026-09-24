import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/application/FormTaskRuntimeContext", () => ({
  exposeTaskFormRuntimeContext: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormResponseRepository", () => ({
  saveDraftFormResponse: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(),
  readFormTaskCompletion: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import type { AuthenticatedUser } from "@/auth/types";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  completeTaskForm,
  saveTaskForm,
} from "@/modules/forms/application/ServerFormsService";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { saveDraftFormResponse } from "@/modules/forms/infrastructure/FormResponseRepository";
import {
  completeFormTask as writeFormTaskCompletion,
  readFormTaskCompletion,
} from "@/modules/forms/infrastructure/FormTaskCompletionRepository";
import { readAssignedFormTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";
const sectionId = "20000000-0000-4000-8000-000000000001";
const hiddenSectionId = "20000000-0000-4000-8000-000000000002";

const runtime = {
  fields: [
    {
      columnSpan: 1 as const,
      key: "HAS_DETAILS",
      label: "Has details",
      order: 1,
      required: true,
      sectionId,
      type: "YES_NO" as const,
    },
    {
      columnSpan: 1 as const,
      key: "DETAILS",
      label: "Details",
      order: 1,
      required: true,
      sectionId: hiddenSectionId,
      type: "TEXTAREA" as const,
    },
  ],
  instructions: null,
  sections: [
    {
      columnSpan: 1 as const,
      description: "",
      id: sectionId,
      key: "CONTROL",
      order: 1,
      showContainer: true,
      title: "Control",
    },
    {
      columnSpan: 1 as const,
      description: "",
      id: hiddenSectionId,
      key: "DETAILS_SECTION",
      order: 2,
      showContainer: true,
      title: "Details",
      visibilityCondition: {
        id: "30000000-0000-4000-8000-000000000001",
        kind: "GROUP" as const,
        combinator: "AND" as const,
        children: [{
          id: "30000000-0000-4000-8000-000000000002",
          kind: "CONDITION" as const,
          leftOperand: { kind: "FIELD" as const, key: "HAS_DETAILS" },
          operator: basicOperators.EQUALS,
          rightOperand: { kind: "CONSTANT" as const, value: true },
        }],
      },
    },
  ],
  submitLabel: "Submit",
  versionId,
  versionNumber: 1,
};

function staff(): AuthenticatedUser {
  return {
    capabilities: new Set([
      permissionCodes.workflowTaskAssignedProcess,
      permissionCodes.workflowTaskAssignedDecide,
    ]),
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
  vi.mocked(readAssignedFormTask).mockResolvedValue({
    formVersionId: versionId,
    permissions: defaultWorkflowElementPermissions,
    rowVersion: 3,
    taskInstanceId: taskId,
    taskStatus: "IN_PROGRESS",
  });
  vi.mocked(saveDraftFormResponse).mockResolvedValue({
    id: "submission",
    rowVersion: 1,
  } as never);
  vi.mocked(readFormTaskCompletion).mockResolvedValue(null);
  vi.mocked(writeFormTaskCompletion).mockResolvedValue({
    kind: "completed",
    result: {
      actionKey: "ADVANCE",
      nextStageName: null,
      rowVersion: 4,
      taskInstanceId: taskId,
      taskStatus: "COMPLETED",
      workflowStatus: "ACTIVE",
    },
  });
});

describe("server form visibility", () => {
  it("does not persist values hidden by a section condition", async () => {
    vi.mocked(getFormRuntime).mockResolvedValue(runtime);

    await saveTaskForm(staff(), {
      correlationId: versionId,
      expectedTaskRowVersion: 3,
      taskInstanceId: taskId,
      values: {
        DETAILS: "A stale value",
        HAS_DETAILS: false,
      },
    });

    expect(saveDraftFormResponse).toHaveBeenCalledWith(
      expect.objectContaining({ values: { HAS_DETAILS: false } }),
    );
  });

  it("treats hidden required fields as optional on completion", async () => {
    vi.mocked(getFormRuntime).mockResolvedValue(runtime);

    await completeTaskForm(staff(), {
      actionKey: "ADVANCE",
      correlationId: versionId,
      expectedTaskRowVersion: 3,
      idempotencyKey: versionId,
      taskInstanceId: taskId,
      values: {
        DETAILS: "A stale value",
        HAS_DETAILS: false,
      },
    });

    expect(writeFormTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ values: { HAS_DETAILS: false } }),
      expect.any(Function),
    );
  });
});
