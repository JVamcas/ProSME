import { beforeEach, describe, expect, it, vi } from "vitest";

import { cmsPermissionCode, permissionCodes } from "@/auth/authorization/permissions";

const state = vi.hoisted(() => ({
  currentUser: vi.fn(),
  find: vi.fn(),
  getPayload: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("payload", () => ({ getPayload: state.getPayload }));
vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: state.currentUser,
}));

import { getAboutEditorSegments } from "@/modules/content/ServerCmsPageEditorService";

function grant(...permissions: string[]) {
  state.currentUser.mockResolvedValue({
    status: "active",
    capabilities: new Set(permissions),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  grant(permissionCodes.cmsAccess, cmsPermissionCode("pages", "read"));
  state.getPayload.mockResolvedValue({ find: state.find });
  state.find.mockResolvedValue({ docs: [{ id: 42 }] });
});

describe("About editor resolution", () => {
  it("selects only the About identifier, including saved drafts", async () => {
    await expect(getAboutEditorSegments()).resolves.toEqual([
      "collections", "pages", "42",
    ]);
    expect(state.find).toHaveBeenCalledWith({
      collection: "pages",
      depth: 0,
      draft: true,
      limit: 1,
      pagination: false,
      overrideAccess: true,
      select: { slug: true },
      where: { slug: { equals: "about" } },
    });
  });

  it.each([
    [],
    [permissionCodes.cmsAccess],
    [cmsPermissionCode("pages", "read")],
    [permissionCodes.cmsAccess, cmsPermissionCode("news", "read")],
  ])("denies mismatched grants before reading data: %j", async (...grants) => {
    grant(...grants);
    await expect(getAboutEditorSegments()).rejects.toThrow("Missing required capability");
    expect(state.getPayload).not.toHaveBeenCalled();
    expect(state.find).not.toHaveBeenCalled();
  });

  it("denies signed-out access before reading data", async () => {
    state.currentUser.mockResolvedValue(null);
    await expect(getAboutEditorSegments()).rejects.toThrow("Authentication is required");
    expect(state.getPayload).not.toHaveBeenCalled();
  });

  it("denies inactive users before reading data", async () => {
    state.currentUser.mockResolvedValue({
      status: "inactive",
      capabilities: new Set([permissionCodes.cmsAccess, cmsPermissionCode("pages", "read")]),
    });
    await expect(getAboutEditorSegments()).rejects.toThrow("Missing required capability");
    expect(state.getPayload).not.toHaveBeenCalled();
  });

  it("opens native creation only when About is missing and creation is granted", async () => {
    grant(
      permissionCodes.cmsAccess,
      cmsPermissionCode("pages", "read"),
      cmsPermissionCode("pages", "create"),
    );
    state.find.mockResolvedValue({ docs: [] });
    await expect(getAboutEditorSegments()).resolves.toEqual([
      "collections", "pages", "create",
    ]);
  });

  it("denies creation without the Pages create grant", async () => {
    state.find.mockResolvedValue({ docs: [] });
    await expect(getAboutEditorSegments()).rejects.toThrow("cms.pages.create");
  });
});
