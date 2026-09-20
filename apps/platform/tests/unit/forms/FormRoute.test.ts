import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/forms/application/ServerFormsService", () => ({
  completeTaskForm: vi.fn().mockResolvedValue({
    nextStageName: null,
    rowVersion: 2,
    taskInstanceId: "c6ee71ce-0ed0-43b9-9381-e2c568634364",
    taskStatus: "COMPLETED",
    workflowStatus: "COMPLETED",
  }),
  getTaskForm: vi.fn(),
  saveTaskForm: vi.fn(),
}));

import { completeTaskForm } from "@/modules/forms/application/ServerFormsService";
import { POST } from "@/app/api/admin/tasks/[id]/form/route";

const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const idempotencyKey = "16f2a85b-82a6-4594-9d37-c8ce4f284443";

describe("form completion route", () => {
  it("rejects completion without an idempotency key", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/tasks/task/form", {
        body: JSON.stringify({
          actionKey: "ADVANCE",
          expectedTaskRowVersion: 1,
          values: {},
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(response.status).toBe(400);
    expect(completeTaskForm).not.toHaveBeenCalled();
  });

  it("passes the task and idempotency key to the service", async () => {
    const response = await POST(
      new Request("http://localhost/api/admin/tasks/task/form", {
        body: JSON.stringify({
          actionKey: "ADVANCE",
          expectedTaskRowVersion: 1,
          values: { NOTES: "Ready" },
        }),
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        method: "POST",
      }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(response.status).toBe(200);
    expect(completeTaskForm).toHaveBeenCalledWith(
      null,
      expect.objectContaining({
        actionKey: "ADVANCE",
        idempotencyKey,
        taskInstanceId: taskId,
      }),
    );
  });
});
