import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({ resolveUserFromHeaders: vi.fn() }));
vi.mock("@/modules/notifications/application/ServerNotificationTemplateService", () => ({
  editNotificationTemplate: vi.fn(),
}));

import { POST } from "@/app/api/admin/notifications/channels/[channelCode]/templates/[targetId]/versions/[versionId]/route";
import { permissionCodes } from "@/auth/authorization/permissions";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/auth/authorization/policy";
import { editNotificationTemplate } from "@/modules/notifications/application/ServerNotificationTemplateService";
import { ResourceNotFoundError } from "@/lib/resource-errors";

const params = {
  channelCode: "EMAIL",
  targetId: "80000000-0000-4000-8000-000000000001",
  versionId: "80000000-0000-4000-8000-000000000002",
};

function request(body: unknown = { subjectTemplate: "Updated subject" }) {
  return new Request("http://localhost/api/admin/notifications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.clearAllMocks());

describe("notification subject edit route", () => {
  it("returns the new draft from the authorized service", async () => {
    vi.mocked(editNotificationTemplate).mockResolvedValue({
      id: params.versionId, versionNumber: 3, status: "DRAFT",
    } as Awaited<ReturnType<typeof editNotificationTemplate>>);
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(200);
    expect((await response.json()).data.versionNumber).toBe(3);
    expect(editNotificationTemplate).toHaveBeenCalledWith(
      undefined, "EMAIL", params.targetId, params.versionId,
      { subjectTemplate: "Updated subject" }, expect.any(String),
    );
  });

  it.each([{ subjectTemplate: "" }, { subjectTemplate: "bad\nsubject" },
    { subjectTemplate: "valid", htmlTemplate: "unrequested body" }])(
    "validates transport input", async (input) => {
      const response = await POST(request(input), { params: Promise.resolve(params) });
      expect(response.status).toBe(400);
      expect(editNotificationTemplate).not.toHaveBeenCalled();
    },
  );

  it.each([
    [new AuthenticationRequiredError(), 401],
    [new PermissionDeniedError(permissionCodes.notificationTemplateImport), 403],
    [new ResourceNotFoundError("notification template version"), 404],
  ])("translates service errors", async (error, status) => {
    vi.mocked(editNotificationTemplate).mockRejectedValue(error);
    const response = await POST(request(), { params: Promise.resolve(params) });
    expect(response.status).toBe(status);
  });
});
