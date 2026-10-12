import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/workflows/application/runtime/ServerWorkflowCoiService", () => ({
  declareWorkflowTaskCoi: vi.fn(), getWorkflowTaskCoi: vi.fn(), reviewWorkflowTaskCoi: vi.fn(),
}));
import { POST } from "@/app/api/admin/tasks/[id]/coi/route";
import { declareWorkflowTaskCoi } from "@/modules/workflows/application/runtime/ServerWorkflowCoiService";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { userWith } from "./WorkflowServiceFixtures";
const taskId = "11111111-1111-4111-8111-111111111111";
const input = { expectedRowVersion: 2, formVersionId: "22222222-2222-4222-8222-222222222222",
  values: { HAS_CONFLICT: false, SIGNATURE: "Reviewer", CUSTOM_ACKNOWLEDGEMENT: true } };
beforeEach(() => vi.clearAllMocks());
function submit(body: unknown) {
  return POST(new Request("http://localhost/api/admin/tasks/id/coi", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: taskId }) });
}
it("passes every answer and the selected version through the protected declaration service", async () => {
  const actor = userWith(permissionCodes.workflowTaskAssignedProcess);
  vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
  vi.mocked(declareWorkflowTaskCoi).mockResolvedValue({ state: "CLEARED_NO_CONFLICT" });
  const response = await submit(input);
  expect(response.status).toBe(200);
  expect(declareWorkflowTaskCoi).toHaveBeenCalledWith(actor, { ...input, taskId });
});
it.each([
  { decision: "NO_CONFLICT", expectedRowVersion: 2 },
  { ...input, formVersionId: "invalid" },
  { ...input, values: [] },
  { ...input, decision: "NO_CONFLICT" },
])("rejects incomplete or client-declared decision payloads: %j", async (body) => {
  expect((await submit(body)).status).toBe(400);
  expect(declareWorkflowTaskCoi).not.toHaveBeenCalled();
});
it("returns a permission denial from the protected service", async () => {
  vi.mocked(declareWorkflowTaskCoi).mockRejectedValue(new PermissionDeniedError(permissionCodes.workflowTaskAssignedProcess));
  expect((await submit(input)).status).toBe(403);
});
