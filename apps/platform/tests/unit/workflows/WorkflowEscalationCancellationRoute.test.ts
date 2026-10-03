import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(async () => null),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowEscalationCancellationService",
  () => ({
    cancelWorkflowEscalation: vi.fn(async () => ({ taskStatus: "PENDING" })),
  }),
);
import { POST } from "@/app/api/admin/tasks/[id]/escalation/cancel/route";
import { cancelWorkflowEscalation } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationCancellationService";
const taskId = crypto.randomUUID();
const escalationId = crypto.randomUUID();
function request(body: unknown) {
  return new Request(
    `http://localhost/api/admin/tasks/${taskId}/escalation/cancel`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}
beforeEach(() => vi.clearAllMocks());
it("passes the chosen escalation, current version and resolved user to the protected service", async () => {
  const response = await POST(
    request({ escalationId, expectedRowVersion: 3 }),
    { params: Promise.resolve({ id: taskId }) },
  );
  expect(response.status).toBe(200);
  expect(cancelWorkflowEscalation).toHaveBeenCalledWith(null, {
    escalationId,
    expectedRowVersion: 3,
    taskId,
    correlationId: expect.any(String),
  });
});
it.each([
  { escalationId: "invalid", expectedRowVersion: 3 },
  { escalationId },
  { escalationId, expectedRowVersion: 3, assignedUserId: "attacker" },
])("rejects invalid or forged cancellation fields %s", async (body) => {
  const response = await POST(request(body), {
    params: Promise.resolve({ id: taskId }),
  });
  expect(response.status).toBe(400);
  expect(cancelWorkflowEscalation).not.toHaveBeenCalled();
});
