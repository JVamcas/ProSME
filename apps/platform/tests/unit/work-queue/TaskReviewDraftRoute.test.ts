import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/modules/work-queue/ServerWorkflowTaskService", () => ({
  saveTaskReviewDraft: vi.fn().mockResolvedValue({ saved: true }),
}));

import { PUT } from "@/app/api/admin/tasks/[id]/review-draft/route";
import { saveTaskReviewDraft } from "@/modules/work-queue/ServerWorkflowTaskService";

const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";

function request(body: unknown) {
  return new Request(`http://localhost/api/admin/tasks/${taskId}/review-draft`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "PUT",
  });
}

describe("review draft route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects malformed review fields before calling the service", async () => {
    const response = await PUT(
      request({ items: [{ accepted: "yes", code: "OWNERSHIP" }] }),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(response.status).toBe(400);
    expect(saveTaskReviewDraft).not.toHaveBeenCalled();
  });

  it("passes a valid draft to the protected service", async () => {
    const body = {
      comments: [{ key: "recommendation", value: "" }],
      items: [{ accepted: false, code: "OWNERSHIP" }],
    };
    const response = await PUT(
      request(body),
      { params: Promise.resolve({ id: taskId }) },
    );
    expect(response.status).toBe(200);
    expect(saveTaskReviewDraft).toHaveBeenCalledWith(
      null,
      taskId,
      body,
      expect.any(String),
    );
  });
});
