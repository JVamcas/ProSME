import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  enable: vi.fn(),
  disable: vi.fn(),
}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: mocks.user,
}));
vi.mock("next/headers", () => ({
  draftMode: async () => ({ enable: mocks.enable, disable: mocks.disable }),
}));

import { GET as preview } from "@/app/api/preview/route";
import { GET as exit } from "@/app/api/preview/exit/route";
import { cmsPermissionCode } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";

function actor(capabilities: string[], status: AuthenticatedUser["status"] = "active"): AuthenticatedUser {
  return {
    id: "editor",
    email: "editor@example.test",
    displayName: "Editor",
    status,
    userType: "staff",
    identitySubject: "editor",
    capabilities: new Set(capabilities),
    roleCodes: new Set(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(actor([cmsPermissionCode("site-settings", "read")]));
});

describe("content preview routes", () => {
  it("redirects Home on the browser origin instead of the internal container host", async () => {
    const response = await preview(new Request("http://localhost:3000/api/preview?path=%2F", {
      headers: { "x-forwarded-host": "fund.example", "x-forwarded-proto": "https" },
    }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/");
    expect(mocks.enable).toHaveBeenCalledOnce();
  });

  it("keeps the requested page path and query on the browser origin", async () => {
    mocks.user.mockResolvedValue(actor([cmsPermissionCode("news", "read")]));
    const path = "/news/update?edition=draft";
    const response = await preview(new Request(
      `http://localhost:3000/api/preview?path=${encodeURIComponent(path)}`,
    ));
    expect(response.headers.get("location")).toBe(path);
    expect(mocks.enable).toHaveBeenCalledOnce();
  });

  it.each(["https://outside.example", "//outside.example", "/\\outside.example"])(
    "does not redirect to an external target %s",
    async (path) => {
      const response = await preview(new Request(
        `http://localhost:3000/api/preview?path=${encodeURIComponent(path)}`,
      ));
      expect(response.headers.get("location")).toBe("/");
    },
  );

  it.each([
    [null, 401],
    [actor([]), 403],
    [actor([cmsPermissionCode("news", "read")]), 403],
    [actor([cmsPermissionCode("site-settings", "read")], "disabled"), 403],
  ])("denies unauthorized preview before enabling draft mode", async (user, status) => {
    mocks.user.mockResolvedValue(user);
    const response = await preview(new Request("http://localhost:3000/api/preview?path=%2F"));
    expect(response.status).toBe(status);
    expect(mocks.enable).not.toHaveBeenCalled();
    expect(response.headers.has("location")).toBe(false);
  });

  it("exits draft mode on the browser origin", async () => {
    const response = await exit();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/");
    expect(mocks.disable).toHaveBeenCalledOnce();
  });
});
