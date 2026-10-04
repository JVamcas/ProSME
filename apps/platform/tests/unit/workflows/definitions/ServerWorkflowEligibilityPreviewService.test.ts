import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowEligibilityPreviewRepository", () => ({
  readWorkflowEligibilityFormPreviews: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getWorkflowEligibilityFormPreviews } from "@/modules/workflows/application/definitions/ServerWorkflowEligibilityPreviewService";
import { readWorkflowEligibilityFormPreviews } from "@/modules/workflows/infrastructure/WorkflowEligibilityPreviewRepository";
import { userWith } from "../WorkflowServiceFixtures";

beforeEach(() => vi.clearAllMocks());

describe("workflow eligibility form preview authorization", () => {
  it("denies access before reading calls", async () => {
    await expect(getWorkflowEligibilityFormPreviews(userWith(), "definition", "version"))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(readWorkflowEligibilityFormPreviews).not.toHaveBeenCalled();
  });

  it("rejects a missing version or one belonging to a different template", async () => {
    vi.mocked(readWorkflowEligibilityFormPreviews).mockResolvedValue(null);
    await expect(getWorkflowEligibilityFormPreviews(
      userWith(permissionCodes.workflowDefinitionRead), "definition", "other-version",
    )).rejects.toBeInstanceOf(ResourceNotFoundError);
    expect(readWorkflowEligibilityFormPreviews).toHaveBeenCalledWith("definition", "other-version");
  });

  it("returns an empty list for a valid version without calls", async () => {
    vi.mocked(readWorkflowEligibilityFormPreviews).mockResolvedValue([]);
    await expect(getWorkflowEligibilityFormPreviews(
      userWith(permissionCodes.workflowDefinitionRead), "definition", "version",
    )).resolves.toEqual([]);
  });
});
