import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/users/ServerUserAccessService", () => ({
  getUserAccessView: vi.fn(),
  inviteUser: vi.fn(),
  updateUserAccess: vi.fn(),
  promoteUser: vi.fn(),
  updateRole: vi.fn(),
}));
vi.mock("@/modules/users/ServerUserProvisioningService", () => ({
  provisionUnprovisionedUser: vi.fn(),
}));

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { GET as readUsers, POST as invite } from "@/app/api/admin/users/route";
import { PATCH as updateUser } from "@/app/api/admin/users/[id]/route";
import { POST as promote } from "@/app/api/admin/users/[id]/promote/route";
import { POST as provision } from "@/app/api/admin/users/[id]/provision/route";
import { PATCH as updateRole } from "@/app/api/admin/roles/[id]/route";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
});

it.each([
  [
    "invite",
    invite,
    {
      displayName: "Test Staff",
      email: "staff@example.test",
      roleCodes: ["reviewer"],
    },
  ],
  ["update user", updateUser, { status: "active" }],
  ["promote", promote, { roleCodes: ["reviewer"] }],
  ["provision", provision, {}],
  [
    "update role",
    updateRole,
    { name: "Reviewer", description: null, capabilityCodes: [] },
  ],
] as const)(
  "checks revocation immediately before %s",
  async (_, handler, body) => {
    const request = new Request("http://localhost/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const response = await handler(request, {
      params: Promise.resolve({ id: "target" }),
    });
    expect(response.status).toBe(200);
    expect(resolveUserFromHeaders).toHaveBeenCalledExactlyOnceWith(
      request.headers,
      { checkRevoked: true },
    );
  },
);

it("keeps normal authenticated directory reads on standard verification", async () => {
  const request = new Request("http://localhost/api/admin/users");
  await readUsers(request);
  expect(resolveUserFromHeaders).toHaveBeenCalledExactlyOnceWith(
    request.headers,
  );
});
