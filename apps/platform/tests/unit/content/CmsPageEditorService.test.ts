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

import { getPageEditorSegments } from "@/modules/content/ServerCmsPageEditorService";

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

describe.each(["about", "how-to-apply", "funding-support", "funding-priority-applicants", "funding-focus-sectors", "faq"] as const)("%s editor resolution", (slug) => {
  it("selects only the page identifier, including saved drafts", async () => {
    await expect(getPageEditorSegments(slug)).resolves.toEqual([
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
      where: { slug: { equals: slug } },
    });
  });

  it.each([
    [],
    [permissionCodes.cmsAccess],
    [cmsPermissionCode("pages", "read")],
    [permissionCodes.cmsAccess, cmsPermissionCode("news", "read")],
  ])("denies mismatched grants before reading data: %j", async (...grants) => {
    grant(...grants);
    await expect(getPageEditorSegments(slug)).rejects.toThrow("Missing required capability");
    expect(state.getPayload).not.toHaveBeenCalled();
    expect(state.find).not.toHaveBeenCalled();
  });

  it("denies signed-out access before reading data", async () => {
    state.currentUser.mockResolvedValue(null);
    await expect(getPageEditorSegments(slug)).rejects.toThrow("Authentication is required");
    expect(state.getPayload).not.toHaveBeenCalled();
  });

  it("denies inactive users before reading data", async () => {
    state.currentUser.mockResolvedValue({
      status: "inactive",
      capabilities: new Set([permissionCodes.cmsAccess, cmsPermissionCode("pages", "read")]),
    });
    await expect(getPageEditorSegments(slug)).rejects.toThrow("Missing required capability");
    expect(state.getPayload).not.toHaveBeenCalled();
  });

  it("opens native creation only when the page is missing and creation is granted", async () => {
    grant(
      permissionCodes.cmsAccess,
      cmsPermissionCode("pages", "read"),
      cmsPermissionCode("pages", "create"),
    );
    state.find.mockResolvedValue({ docs: [] });
    await expect(getPageEditorSegments(slug)).resolves.toEqual([
      "collections", "pages", "create",
    ]);
  });

  it("denies creation without the Pages create grant", async () => {
    state.find.mockResolvedValue({ docs: [] });
    await expect(getPageEditorSegments(slug)).rejects.toThrow("cms.pages.create");
  });
});
