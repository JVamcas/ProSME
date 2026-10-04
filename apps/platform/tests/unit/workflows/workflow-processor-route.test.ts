import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/integrations/monitoring/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/modules/workflows/application/runtime/ServerWorkflowDeadlineService", () => ({
  processConfiguredWorkflowDeadlineBatch: vi.fn(),
}));

import { POST } from "@/app/api/internal/workflows/process/route";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { processConfiguredWorkflowDeadlineBatch } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineService";

beforeEach(() => vi.clearAllMocks());

describe("workflow processor transport", () => {
  it("passes the service credential and a validated correlation id to the use case", async () => {
    const requestId = crypto.randomUUID();
    const data = { claimed: 2, failed: 1, processed: 1, skipped: 0 };
    vi.mocked(processConfiguredWorkflowDeadlineBatch).mockResolvedValue(data);
    const response = await POST(new Request("http://localhost/api/internal/workflows/process", {
      method: "POST", headers: { authorization: "Bearer service-secret", "x-request-id": requestId },
    }));
    expect(await response.json()).toEqual({ data });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(processConfiguredWorkflowDeadlineBatch).toHaveBeenCalledWith("Bearer service-secret", requestId);
  });

  it.each([
    [new AuthenticationRequiredError(), 401],
    [new PermissionDeniedError(permissionCodes.workflowDeadlineAllProcess), 403],
    [new Error("private applicant@example.test secret"), 500],
  ])("maps errors without leaking their contents", async (error, status) => {
    vi.mocked(processConfiguredWorkflowDeadlineBatch).mockRejectedValue(error);
    const response = await POST(new Request("http://localhost/api/internal/workflows/process", { method: "POST" }));
    expect(response.status).toBe(status);
    expect(JSON.stringify(await response.json())).not.toContain("applicant@example.test");
  });
});
