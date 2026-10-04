import type { AuthenticatedUser } from "@/auth/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readAssignedFormTask: vi.fn(),
}));
vi.mock("@/modules/forms/infrastructure/FormResponseRepository", () => ({ saveDraftFormResponse: vi.fn() }));
vi.mock("@/modules/forms/infrastructure/FormTaskCompletionRepository", () => ({
  completeFormTask: vi.fn(), readFormTaskCompletion: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { readAssignedFormTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { saveDraftFormResponse } from "@/modules/forms/infrastructure/FormResponseRepository";
import { completeFormTask } from "@/modules/forms/infrastructure/FormTaskCompletionRepository";
import { PATCH, POST } from "@/app/api/admin/tasks/[id]/form/route";

import { workflowTaskActorFixture } from "../../support/WorkflowTaskServiceFixture";

const taskId = "10000000-0000-4000-8000-000000000001";
const actor: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "20000000-0000-4000-8000-000000000002", status: "active",
  capabilities: new Set([
    permissionCodes.workflowTaskAllRead,
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowTaskAssignedDecide,
  ]),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
  vi.mocked(readAssignedFormTask).mockResolvedValue(null);
});

describe("read-only task form write protection", () => {
  it.each(["PATCH", "POST"])("rejects %s for another reviewer's form", async (method) => {
    const request = new Request(`http://localhost/api/admin/tasks/${taskId}/form`, {
      method,
      headers: { "Idempotency-Key": "30000000-0000-4000-8000-000000000003" },
      body: JSON.stringify({ actionKey: null, expectedTaskRowVersion: 1, values: { note: "Changed" } }),
    });
    const response = await (method === "PATCH" ? PATCH : POST)(request, {
      params: Promise.resolve({ id: taskId }),
    });
    expect(response.status).toBe(404);
    expect(readAssignedFormTask).toHaveBeenCalledWith(actor.id, taskId);
    expect(saveDraftFormResponse).not.toHaveBeenCalled();
    expect(completeFormTask).not.toHaveBeenCalled();
  });
});
