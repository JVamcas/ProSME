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
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository", () => ({
  readWorkflowTaskRuntimeContext: vi.fn(),
}));
vi.mock("@/modules/funding-calls/ServerFundingOpportunityIntegration", () => ({
  findPublishedFundingOpportunity: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
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
} from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { readWorkflowTaskRuntimeContext } from "@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository";
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";

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
  sections: [{
    columnSpan: 1 as const,
    description: "",
    id: "20000000-0000-4000-8000-000000000001",
    key: "MAIN",
    order: 1,
    showContainer: true,
    title: "Main",
  }],
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
  vi.mocked(findPublishedFundingOpportunity).mockResolvedValue(null);
});

describe("submitted form snapshots", () => {
  it("lodges the exact form version, definition and submitted values", async () => {
    const values = { NOTES: "Final answer" };
    vi.mocked(readAssignedFormTask).mockResolvedValue({
      formVersionId: versionId,
      permissions: defaultWorkflowElementPermissions,
      rowVersion: 3,
      taskInstanceId: taskId,
      taskStatus: "IN_PROGRESS",
    });
    vi.mocked(getFormRuntime).mockResolvedValue(runtime);
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

    await completeTaskForm(
      staff(permissionCodes.workflowTaskAssignedDecide),
      {
        actionKey: "ADVANCE",
        correlationId: versionId,
        expectedTaskRowVersion: 3,
        idempotencyKey: versionId,
        taskInstanceId: taskId,
        values,
      },
    );

    expect(writeFormTaskCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        actionKey: "ADVANCE",
        definitionSnapshot: runtime,
        formVersionId: versionId,
        values,
      }),
      expect.any(Function),
    );
  });

  it("reproduces a completed response from its lodged snapshot", async () => {
    const lodgedSchema = {
      ...runtime,
      instructions: "Instructions at submission time",
    };
    vi.mocked(readWorkflowTaskRuntimeContext).mockResolvedValue({
      application: {
        business: {},
        declarations: {},
        financial: {},
        fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
        id: "10000000-0000-4000-8000-000000000001",
        project: {},
        reference: "SMEF-1",
        sectionCompletion: {},
        status: "submitted",
      },
      binding: { contextFields: [], formVersionId: versionId },
      fundingCallTitle: "Growth Fund",
      permissions: defaultWorkflowElementPermissions,
      priorStageValues: [],
      stage: {},
      task: {
        definitionId: "30000000-0000-4000-8000-000000000001",
        id: taskId,
        key: "REVIEW_FORM",
        rowVersion: 4,
      },
      workflow: {},
    });
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
    expect(result.response?.values).toEqual({ NOTES: "Lodged answer" });
  });
});
