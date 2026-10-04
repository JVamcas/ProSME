import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormEditor: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { getForm } from "@/modules/forms/application/ServerFormsService";
import { getFormEditor } from "@/modules/forms/infrastructure/FormRepository";
import { user } from "../../support/FundingCallServiceFixture";

const definitionId = "20000000-0000-4000-8000-000000000002";
const versionId = "20000000-0000-4000-8000-000000000001";

beforeEach(() => vi.clearAllMocks());

describe("exact form version read", () => {
  it.each(["PUBLISHED", "RETIRED"])("returns the attached %s version", async (status) => {
    vi.mocked(getFormEditor).mockResolvedValue({
      definition: {
        id: definitionId,
        name: "Application form",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      version: {
        id: versionId,
        status,
        versionNumber: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        publishedAt: new Date(),
        retiredAt: status === "RETIRED" ? new Date() : null,
      },
      fields: [],
      sections: [],
      versions: [],
    } as never);
    const view = await getForm(user([permissionCodes.workflowFormRead]), definitionId, versionId);
    expect(view.version.id).toBe(versionId);
    expect(view.version.status).toBe(status);
    expect(getFormEditor).toHaveBeenCalledWith(definitionId, versionId);
  });

  it("rejects a missing version instead of falling back to latest", async () => {
    vi.mocked(getFormEditor).mockResolvedValue(null);
    await expect(getForm(user([permissionCodes.workflowFormRead]), definitionId, versionId))
      .rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it("requires form read authority before resolving the version", async () => {
    await expect(getForm(user([permissionCodes.fundingCallRead]), definitionId, versionId))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(getFormEditor).not.toHaveBeenCalled();
  });
});
