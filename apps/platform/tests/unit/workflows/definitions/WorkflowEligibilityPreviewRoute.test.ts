import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/workflows/application/definitions/ServerWorkflowEligibilityPreviewService", () => ({
  getWorkflowEligibilityFormPreviews: vi.fn(),
}));

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { GET } from "@/app/api/workflows/[id]/eligibility-forms/route";
import { getWorkflowEligibilityFormPreviews } from "@/modules/workflows/application/definitions/ServerWorkflowEligibilityPreviewService";
import { userWith } from "../WorkflowServiceFixtures";

const definitionId = "10000000-0000-4000-8000-000000000001";
const versionId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("workflow eligibility preview route", () => {
  it("validates the selected workflow version before invoking the service", async () => {
    const response = await GET(new Request("http://localhost/api/workflows/id/eligibility-forms?versionId=invalid"), {
      params: Promise.resolve({ id: definitionId }),
    });
    expect(response.status).toBe(400);
    expect(getWorkflowEligibilityFormPreviews).not.toHaveBeenCalled();
  });

  it("passes the resolved actor and exact version to the protected service", async () => {
    const actor = userWith(permissionCodes.workflowDefinitionRead);
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
    vi.mocked(getWorkflowEligibilityFormPreviews).mockResolvedValue([]);
    const response = await GET(new Request(`http://localhost/api/workflows/${definitionId}/eligibility-forms?versionId=${versionId}`), {
      params: Promise.resolve({ id: definitionId }),
    });
    expect(response.status).toBe(200);
    expect(getWorkflowEligibilityFormPreviews).toHaveBeenCalledWith(actor, definitionId, versionId);
    expect(await response.json()).toMatchObject({ data: [] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("translates an authorization denial to HTTP 403", async () => {
    vi.mocked(getWorkflowEligibilityFormPreviews).mockRejectedValue(new PermissionDeniedError(permissionCodes.workflowDefinitionRead));
    const response = await GET(new Request(`http://localhost/api/workflows/${definitionId}/eligibility-forms?versionId=${versionId}`), {
      params: Promise.resolve({ id: definitionId }),
    });
    expect(response.status).toBe(403);
  });
});
