import type { AuthenticatedUser } from "@/auth/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock("@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService", () => ({
  getWorkflowActionAvailability: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskReviewRepository", () => ({
  writeTaskReviewDraft: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskActionRepository", () => ({
  readChecklistTaskCompletion: vi.fn(),
  writeChecklistTaskCompletion: vi.fn(),
}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET } from "@/app/api/admin/tasks/[id]/route";
import { POST } from "@/app/api/admin/tasks/[id]/complete/route";
import { PUT } from "@/app/api/admin/tasks/[id]/review-draft/route";
import { getWorkflowTask } from "@/modules/work-queue/application/ServerWorkflowTaskService";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { writeTaskReviewDraft } from "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository";
import { writeChecklistTaskCompletion } from "@/modules/workflows/infrastructure/WorkflowTaskActionRepository";
import {
  workflowTaskActorFixture,
  workflowTaskServiceFixture as task,
} from "../../support/WorkflowTaskServiceFixture";

const admin: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "20000000-0000-4000-8000-000000000002",
  status: "active",
  capabilities: new Set([permissionCodes.workflowTaskAllRead]),
  roleCodes: new Set(["admin"]),
};
const params = { params: Promise.resolve({ id: task.taskInstanceId }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(admin);
  vi.mocked(readWorkflowTask).mockImplementation(async (_actor, _task, allowAll) =>
    allowAll ? {
      ...task,
      assignedToActor: false,
      coiCleared: false,
      assignedUserName: "Assigned reviewer",
      result: { items: [{ code: "OWNERSHIP", accepted: true }] },
    } : null,
  );
});

describe("workflow task oversight", () => {
  it("opens another reviewer's task without action authority or COI clearance", async () => {
    const response = await GET(new Request("http://localhost/task"), params);
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({
      readOnly: true,
      assignedUserName: "Assigned reviewer",
      actions: [],
      resultItems: [{ code: "OWNERSHIP", accepted: true }],
    });
    expect(data).not.toHaveProperty("permissions");
    expect(data).not.toHaveProperty("coiCleared");
    expect(getWorkflowActionAvailability).not.toHaveBeenCalled();
    expect(readWorkflowTask).toHaveBeenCalledWith(admin.id, task.taskInstanceId, true, [...admin.capabilities]);
  });

  it("does not use the admin role or workflow progress permission as task read authority", async () => {
    const denied = { ...admin, capabilities: new Set([permissionCodes.workflowInstanceAllRead]) };
    await expect(getWorkflowTask(denied, task.taskInstanceId)).rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowTask).not.toHaveBeenCalled();
  });

  it("requires resource assignment for an assigned-only reader", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({
      ...admin, capabilities: new Set([permissionCodes.workflowTaskAssignedRead]),
    });
    const response = await GET(new Request("http://localhost/task"), params);
    expect(response.status).toBe(404);
    expect(await response.text()).toContain("do not have permission to view it");
    expect(readWorkflowTask).toHaveBeenCalledWith(admin.id, task.taskInstanceId, false, [permissionCodes.workflowTaskAssignedRead]);
  });

  it.each(["ACTIVE", "COMPLETED"])("can inspect tasks in a %s workflow", async (workflowStatus) => {
    vi.mocked(readWorkflowTask).mockResolvedValue({ ...task, workflowStatus, assignedToActor: false });
    expect(await getWorkflowTask(admin, task.taskInstanceId)).toMatchObject({ readOnly: true, actions: [] });
  });

  it("keeps an authorized assignee's processing flow", async () => {
    const assignee = {
      ...admin,
      capabilities: new Set([
        permissionCodes.workflowTaskAssignedRead,
        permissionCodes.workflowTaskAssignedProcess,
        permissionCodes.workflowTaskAssignedDecide,
      ]),
    };
    vi.mocked(readWorkflowTask).mockResolvedValue(task);
    vi.mocked(getWorkflowActionAvailability).mockResolvedValue([]);
    expect(await getWorkflowTask(assignee, task.taskInstanceId)).toMatchObject({ readOnly: false });
    expect(getWorkflowActionAvailability).toHaveBeenCalled();
  });

  it("preserves configured decision access without requiring edit permission", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue(task);
    vi.mocked(getWorkflowActionAvailability).mockResolvedValue([]);
    const assignee = {
      ...admin,
      capabilities: new Set([
        permissionCodes.workflowTaskAssignedRead,
        permissionCodes.workflowTaskAssignedDecide,
      ]),
    };
    expect(await getWorkflowTask(assignee, task.taskInstanceId)).toMatchObject({ readOnly: false });
    expect(getWorkflowActionAvailability).toHaveBeenCalled();
  });

  it("cannot save or complete another person's task even with processing permissions", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue({
      ...admin,
      capabilities: new Set([
        ...admin.capabilities,
        permissionCodes.workflowTaskAssignedProcess,
        permissionCodes.workflowTaskAssignedDecide,
      ]),
    });
    const draft = await PUT(new Request("http://localhost/task/review-draft", {
      method: "PUT",
      body: JSON.stringify({ items: [{ code: "OWNERSHIP", accepted: true }] }),
    }), params);
    const complete = await POST(new Request("http://localhost/task/complete", {
      method: "POST",
      headers: { "Idempotency-Key": "30000000-0000-4000-8000-000000000003" },
      body: JSON.stringify({ expectedRowVersion: 2, items: [{ code: "OWNERSHIP", accepted: true }] }),
    }), params);
    expect(draft.status).toBe(404);
    expect(complete.status).toBe(404);
    expect(vi.mocked(readWorkflowTask).mock.calls.every((call) => !call[2])).toBe(true);
    expect(writeTaskReviewDraft).not.toHaveBeenCalled();
    expect(writeChecklistTaskCompletion).not.toHaveBeenCalled();
  });
});
