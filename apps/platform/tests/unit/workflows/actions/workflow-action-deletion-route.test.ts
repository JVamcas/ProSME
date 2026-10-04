import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/definitions/ServerWorkflowActionDeletionService",
  () => ({
    deleteWorkflowAction: vi.fn(),
  }),
);

import { DELETE } from "@/app/api/workflows/[id]/definition-actions/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ResourceConflictError } from "@/lib/resource-errors";
import { deleteWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionDeletionService";

const definitionId = "11111111-1111-4111-8111-111111111111";
const input = {
  versionId: "22222222-2222-4222-8222-222222222222",
  expectedRowVersion: 2,
  stageKey: "REVIEW",
  actionKey: "APPROVE",
};
const context = { params: Promise.resolve({ id: definitionId }) };

function request(body: unknown = input) {
  return new Request(
    `https://example.test/api/workflows/${definitionId}/definition-actions`,
    {
      method: "DELETE",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
  vi.mocked(deleteWorkflowAction).mockResolvedValue({ graph: {} } as never);
});

describe("workflow definition action deletion route", () => {
  it("passes only the target and version to the authorized service", async () => {
    const response = await DELETE(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(deleteWorkflowAction).toHaveBeenCalledWith(
      { id: "actor" },
      definitionId,
      input,
      expect.any(String),
    );
  });

  it.each([
    { ...input, actionKey: "invalid key" },
    { ...input, versionId: "invalid" },
    { ...input, expectedRowVersion: 0 },
    { ...input, graph: { stages: [], transitions: [] } },
  ])("rejects invalid input and arbitrary graph edits", async (body) => {
    expect((await DELETE(request(body), context)).status).toBe(400);
    expect(deleteWorkflowAction).not.toHaveBeenCalled();
  });

  it("rejects an invalid definition identifier", async () => {
    const response = await DELETE(request(), {
      params: Promise.resolve({ id: "invalid" }),
    });
    expect(response.status).toBe(400);
    expect(deleteWorkflowAction).not.toHaveBeenCalled();
  });

  it("translates permission denial", async () => {
    vi.mocked(deleteWorkflowAction).mockRejectedValue(
      new PermissionDeniedError(permissionCodes.workflowDefinitionUpdate),
    );
    expect((await DELETE(request(), context)).status).toBe(403);
  });

  it("translates concurrent edits into a conflict", async () => {
    vi.mocked(deleteWorkflowAction).mockRejectedValue(
      new ResourceConflictError("Changed"),
    );
    expect((await DELETE(request(), context)).status).toBe(409);
  });
});
