import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowProgressService",
  () => ({
    getWorkflowProgress: vi.fn(),
  }),
);

import { GET } from "@/app/api/applications/[id]/workflow-progress/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";
import { workflowProgressFixture } from "../../support/WorkflowProgressFixture";

const applicationId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const request = new Request(
  `https://example.test/api/applications/${applicationId}/workflow-progress?taskId=${taskId}`,
);
const context = { params: Promise.resolve({ id: applicationId }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
  vi.mocked(getWorkflowProgress).mockResolvedValue(workflowProgressFixture);
});

describe("workflow progress route", () => {
  it("reads all-scope progress without a task through the protected service", async () => {
    const response = await GET(
      new Request(
        `https://example.test/api/applications/${applicationId}/workflow-progress`,
      ),
      context,
    );
    expect(response.status).toBe(200);
    expect(getWorkflowProgress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "actor" }),
      applicationId,
      undefined,
    );
  });

  it("rejects invalid supplied task identifiers", async () => {
    const response = await GET(
      new Request(
        `https://example.test/api/applications/${applicationId}/workflow-progress?taskId=invalid`,
      ),
      context,
    );
    expect(response.status).toBe(400);
    expect(getWorkflowProgress).not.toHaveBeenCalled();
  });

  it("returns progress through the authorized service without caching", async () => {
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).data).toEqual(workflowProgressFixture);
    expect(getWorkflowProgress).toHaveBeenCalledWith(
      expect.objectContaining({ id: "actor" }),
      applicationId,
      { taskId },
    );
  });

  it("rejects invalid application identifiers before reading progress", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ id: "invalid" }),
    });

    expect(response.status).toBe(400);
    expect(getWorkflowProgress).not.toHaveBeenCalled();
  });

  it("returns forbidden when the service denies workflow access", async () => {
    vi.mocked(getWorkflowProgress).mockRejectedValue(
      new PermissionDeniedError(permissionCodes.workflowInstanceAllRead),
    );

    expect((await GET(request, context)).status).toBe(403);
  });

  it("preserves the empty workflow response", async () => {
    vi.mocked(getWorkflowProgress).mockResolvedValue(null);

    expect((await (await GET(request, context)).json()).data).toBeNull();
  });
});
