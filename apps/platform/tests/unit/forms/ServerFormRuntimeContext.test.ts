import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/WorkflowTaskFormResponseRepository", () => ({
  readWorkflowTaskFormResponse: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormResponseRepository", () => ({
  readFormResponse: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository", () => ({
  readWorkflowTaskRuntimeContext: vi.fn(),
}));
vi.mock("@/modules/forms/application/FormTaskRuntimeContext", () => ({
  exposeTaskFormRuntimeContext: vi.fn(),
}));

import { readWorkflowTaskFormResponse } from "@/modules/forms/infrastructure/WorkflowTaskFormResponseRepository";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import type { AuthenticatedUser } from "@/auth/types";
import { getTaskForm } from "@/modules/forms/application/ServerTaskFormReadService";
import { exposeTaskFormRuntimeContext } from "@/modules/forms/application/FormTaskRuntimeContext";
import { getFormRuntime } from "@/modules/forms/infrastructure/FormRepository";
import { readFormResponse } from "@/modules/forms/infrastructure/FormResponseRepository";
import { readWorkflowTaskRuntimeContext } from "@/modules/workflows/infrastructure/WorkflowRuntimeContextRepository";

const actorId = "79e20de0-3558-4d63-90a4-8c9f5125df07";
const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";

const actor: AuthenticatedUser = {
  capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
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

const source = {
  application: {
    business: {},
    declarations: {},
    financial: {},
    fundingOpportunityId: "00000000-0000-4000-8000-000000000042",
    id: "10000000-0000-4000-8000-000000000001",
    project: { requestedAmount: 250000 },
    reference: "SMEF-2026-000001",
    sectionCompletion: {},
    status: "submitted",
  },
  binding: {
    contextFields: [{
      key: "application.requested_amount",
      label: "Requested amount",
      type: "NUMBER" as const,
    }],
    formVersionId: versionId,
  },
  eligibility: { eligible: true, outcome: "ELIGIBLE" },
  fundingCallTitle: "Growth Fund",
  permissions: defaultWorkflowElementPermissions,
  priorStageValues: [],
  stage: {},
  task: {
    definitionId: "30000000-0000-4000-8000-000000000001",
    id: taskId,
    key: "FINANCE_FORM",
    rowVersion: 3,
  },
  workflow: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowTaskRuntimeContext).mockResolvedValue(source);
  vi.mocked(getFormRuntime).mockResolvedValue({
    fields: [],
    instructions: null,
    sections: [],
    submitLabel: "Submit",
    versionId,
    versionNumber: 1,
  });
  vi.mocked(readFormResponse).mockResolvedValue(null as never);
  vi.mocked(exposeTaskFormRuntimeContext).mockResolvedValue({
    "application.requested_amount": 250000,
  });
});

describe("task form runtime context", () => {
  it("returns selected read-only context with the exact bound form", async () => {
    const result = await getTaskForm(actor, taskId);

    expect(readFormResponse).toHaveBeenCalledWith(actorId, taskId, versionId);
    expect(exposeTaskFormRuntimeContext).toHaveBeenCalledWith(source);
    expect(result.context).toEqual({
      "application.requested_amount": 250000,
    });
    expect(result.schema.versionId).toBe(versionId);
    expect(result.taskRowVersion).toBe(3);
  });
});


describe("oversight task form reads", () => {
  it("reads the assignee's saved response for the pinned version", async () => {
    vi.mocked(readWorkflowTaskFormResponse).mockResolvedValue({
      status: "DRAFT",
      values: { recommendation: "Saved reviewer response" },
      rowVersion: 4,
      completedAt: null,
    } as never);
    const result = await getTaskForm({
      ...actor,
      capabilities: new Set([permissionCodes.workflowTaskAllRead]),
    }, taskId);
    expect(result.readOnly).toBe(true);
    expect(result.response?.values).toEqual({ recommendation: "Saved reviewer response" });
    expect(readWorkflowTaskRuntimeContext).toHaveBeenCalledWith(actorId, taskId, true, [permissionCodes.workflowTaskAllRead]);
    expect(readWorkflowTaskFormResponse).toHaveBeenCalledWith(taskId, versionId);
    expect(readFormResponse).not.toHaveBeenCalled();
  });

  it("uses the immutable completed response snapshot", async () => {
    const snapshot = { versionId, versionNumber: 2, fields: [], sections: [] };
    vi.mocked(readWorkflowTaskFormResponse).mockResolvedValue({
      status: "COMPLETED", definitionSnapshot: snapshot, completedAt: null,
    } as never);
    const result = await getTaskForm({
      ...actor, capabilities: new Set([permissionCodes.workflowTaskAllRead]),
    }, taskId);
    expect(result.schema).toBe(snapshot);
  });

  it("rejects reads before loading runtime data without task read permission", async () => {
    await expect(getTaskForm({ ...actor, capabilities: new Set() }, taskId))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowTaskRuntimeContext).not.toHaveBeenCalled();
    expect(readWorkflowTaskFormResponse).not.toHaveBeenCalled();
  });
});
