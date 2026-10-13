import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/forms/infrastructure/FormRepository", () => ({
  getFormRuntime: vi.fn(),
  listBindableFormVersions: vi.fn(),
}));
import {
  getConfiguredFormPreview,
  getTaskFormOptions,
  getTaskFormSearchContent,
} from "@/modules/forms/application/ServerFormConfigurationService";
import {
  getFormRuntime,
  listBindableFormVersions,
} from "@/modules/forms/infrastructure/FormRepository";
vi.mock("@/modules/forms/infrastructure/FormSearchRepository", () => ({
  readFormSearchContent: vi.fn(),
}));
import { readFormSearchContent } from "@/modules/forms/infrastructure/FormSearchRepository";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

const actor = (capabilities: string[]): AuthenticatedUser => ({
  id: "actor",
  status: "active",
  capabilities: new Set(capabilities),
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: null,
  email: "reviewer@example.test",
  displayName: "Reviewer",
  userType: "staff",
  identitySubject: "reviewer",
  roleCodes: new Set(),
});
beforeEach(() => vi.clearAllMocks());

describe("task form configuration access", () => {
  it("authorizes search content before loading and deduplicates requested versions", async () => {
    await expect(getTaskFormSearchContent(null, ["v"])).rejects.toThrow();
    await expect(getTaskFormSearchContent(actor([]), ["v"])).rejects.toThrow();
    expect(readFormSearchContent).not.toHaveBeenCalled();
    vi.mocked(readFormSearchContent).mockResolvedValue([]);
    await getTaskFormSearchContent(
      actor([permissionCodes.workflowDefinitionRead]),
      ["v", "v"],
    );
    expect(readFormSearchContent).toHaveBeenCalledWith(["v"]);
  });
  it("denies users without configuration read permission before reading forms", async () => {
    await expect(getTaskFormOptions(actor([]))).rejects.toThrow();
    await expect(getConfiguredFormPreview(null, "version")).rejects.toThrow();
    expect(listBindableFormVersions).not.toHaveBeenCalled();
    expect(getFormRuntime).not.toHaveBeenCalled();
  });
  it("allows workflow definition readers to inspect draft review forms", async () => {
    vi.mocked(listBindableFormVersions).mockResolvedValue([]);
    await getTaskFormOptions(actor([permissionCodes.workflowDefinitionRead]));
    expect(listBindableFormVersions).toHaveBeenCalledWith("APPLICATION_REVIEW");
    vi.mocked(getFormRuntime).mockResolvedValue({
      versionId: "version",
    } as never);
    expect(
      await getConfiguredFormPreview(
        actor([permissionCodes.workflowFormRead]),
        "version",
      ),
    ).toEqual({ versionId: "version" });
    expect(getFormRuntime).toHaveBeenCalledWith("version", true);
  });
});
