import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationTemplateService",
  () => ({ getNotificationChannel: vi.fn() }),
);
import { GET } from "@/app/api/admin/notifications/channels/[channelCode]/route";
import { getNotificationChannel } from "@/modules/notifications/application/ServerNotificationTemplateService";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";

const context = { params: Promise.resolve({ channelCode: "EMAIL" }) };
const request = (search: string) =>
  new Request(
    `http://localhost/api/admin/notifications/channels/EMAIL?search=${encodeURIComponent(search)}`,
  );
beforeEach(() => vi.clearAllMocks());

describe("notification channel catalog search route", () => {
  it("normalizes search text and delegates to the protected service", async () => {
    vi.mocked(getNotificationChannel).mockResolvedValue({
      targets: [],
    } as never);
    const response = await GET(request("  workflow  "), context);
    expect(response.status).toBe(200);
    expect(getNotificationChannel).toHaveBeenCalledWith(undefined, "EMAIL", {
      search: "workflow",
    });
  });
  it("rejects searches longer than 200 characters", async () => {
    expect((await GET(request("x".repeat(201)), context)).status).toBe(400);
    expect(getNotificationChannel).not.toHaveBeenCalled();
  });
  it.each([
    [new AuthenticationRequiredError(), 401],
    [
      new PermissionDeniedError(permissionCodes.notificationConfigurationRead),
      403,
    ],
  ])(
    "preserves authentication and permission errors",
    async (error, status) => {
      vi.mocked(getNotificationChannel).mockRejectedValue(error);
      expect((await GET(request("workflow"), context)).status).toBe(status);
    },
  );
});
