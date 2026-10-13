import { beforeEach, describe, expect, it, vi } from "vitest";

import { permissionCodes } from "@/auth/authorization/permissions";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  headers: vi.fn(),
  getPayload: vi.fn(),
  auth: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@payload-config", () => ({ default: {} }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("payload", () => ({ getPayload: mocks.getPayload }));
vi.mock("@/auth/authorization/current-user", () => ({
  getCurrentUser: mocks.currentUser,
}));

import { getCmsLoginDestination } from "@/platform/auth/ServerCmsAuthNavigation";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.currentUser.mockResolvedValue({
    status: "active",
    capabilities: new Set([permissionCodes.cmsAccess]),
  });
  mocks.headers.mockResolvedValue(new Headers({ cookie: "session=test" }));
  mocks.getPayload.mockResolvedValue({ auth: mocks.auth });
  mocks.auth.mockResolvedValue({ user: null });
});

describe("CMS authentication navigation", () => {
  it("sends a missing or expired platform session to sign-in with a CMS return path", async () => {
    mocks.currentUser.mockResolvedValue(null);

    expect(await getCmsLoginDestination()).toBe("/sign-in?returnTo=%2Fcms");
    expect(mocks.getPayload).not.toHaveBeenCalled();
  });

  it.each([
    { status: "active", capabilities: new Set() },
    { status: "disabled", capabilities: new Set([permissionCodes.cmsAccess]) },
  ])("denies an application user without active CMS access: %j", async (user) => {
    mocks.currentUser.mockResolvedValue(user);

    expect(await getCmsLoginDestination()).toBe("/unauthorized");
    expect(mocks.getPayload).not.toHaveBeenCalled();
  });

  it("denies a platform user when Payload rejects a missing or disabled CMS principal", async () => {
    expect(await getCmsLoginDestination()).toBe("/unauthorized");
    expect(mocks.auth).toHaveBeenCalledWith({
      headers: await mocks.headers.mock.results[0].value,
    });
  });

  it("denies a Payload user without the CMS access grant", async () => {
    mocks.auth.mockResolvedValue({ user: { capabilities: [] } });

    expect(await getCmsLoginDestination()).toBe("/unauthorized");
  });

  it("returns to CMS only when platform and Payload access both succeed", async () => {
    mocks.auth.mockResolvedValue({
      user: { capabilities: [permissionCodes.cmsAccess] },
    });

    expect(await getCmsLoginDestination()).toBe("/cms");
  });

  it("preserves infrastructure errors instead of redirecting back into CMS", async () => {
    mocks.auth.mockRejectedValue(new Error("Database unavailable"));

    await expect(getCmsLoginDestination()).rejects.toThrow("Database unavailable");
  });
});
