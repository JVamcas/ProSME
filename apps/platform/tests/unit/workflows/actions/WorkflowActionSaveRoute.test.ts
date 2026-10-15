import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowActionSaveService",
  () => ({ saveWorkflowAction: vi.fn() }),
);

import { PATCH } from "@/app/api/workflows/[id]/definition-actions/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ResourceConflictError } from "@/lib/resource-errors";
import { saveWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionSaveService";
import {
  workflowActionSaveInput,
  workflowActionSaveRecord,
} from "../../../support/WorkflowActionSaveFixture";

const record = workflowActionSaveRecord();
const input = workflowActionSaveInput(record);
const context = { params: Promise.resolve({ id: record.definition.id }) };
function request(body: unknown = input) {
  return new Request(
    "https://example.test/api/workflows/definition/definition-actions",
    {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
  vi.mocked(saveWorkflowAction).mockResolvedValue({ graph: {} } as never);
});

describe("scoped workflow action save route", () => {
  it("passes validated scoped input to the authorized service", async () => {
    const response = await PATCH(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(saveWorkflowAction).toHaveBeenCalledWith(
      { id: "actor" },
      record.definition.id,
      input,
      expect.any(String),
    );
  });
  it.each([
    { ...input, expectedRowVersion: 0 },
    { ...input, versionId: "invalid" },
    { ...input, graph: record.graph },
    { ...input, action: { ...input.action, label: "" } },
  ])("rejects malformed input without calling the service", async (body) => {
    expect((await PATCH(request(body), context)).status).toBe(400);
    expect(saveWorkflowAction).not.toHaveBeenCalled();
  });
  it.each([403, 409])(
    "translates protected operation failure to %s",
    async (status) => {
      vi.mocked(saveWorkflowAction).mockRejectedValue(
        status === 403
          ? new PermissionDeniedError(permissionCodes.workflowDefinitionUpdate)
          : new ResourceConflictError("The workflow changed."),
      );
      expect((await PATCH(request(), context)).status).toBe(status);
    },
  );
});
