import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/modules/users/ServerUserProvisioningService", () => ({
  provisionUnprovisionedUser: vi.fn(),
}));

import { POST } from "@/app/api/admin/users/[id]/provision/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { provisionUnprovisionedUser } from "@/modules/users/ServerUserProvisioningService";

const request = new Request(
  "https://example.test/api/admin/users/firebase%3Auid/provision",
  { method: "POST" },
);
const context = { params: Promise.resolve({ id: "firebase:uid" }) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveUserFromHeaders).mockResolvedValue({ id: "actor" } as never);
  vi.mocked(provisionUnprovisionedUser).mockResolvedValue({
    id: "platform-user",
  } as never);
});

describe("manual user provisioning route", () => {
  it("passes the authenticated actor and Firebase directory ID to the service", async () => {
    const response = await POST(request, context);

    expect(response.status).toBe(200);
    expect(provisionUnprovisionedUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "actor" }),
      "firebase:uid",
    );
  });

  it("returns forbidden when the actor lacks permission", async () => {
    vi.mocked(provisionUnprovisionedUser).mockRejectedValue(
      new PermissionDeniedError("user.manage"),
    );

    const response = await POST(request, context);

    expect(response.status).toBe(403);
  });
});
