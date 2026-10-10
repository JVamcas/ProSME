import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getDatabase } from "@/platform/database/client";
import { GET, PATCH } from "@/app/api/admin/chatbot/settings/route";
import { permissionCodes } from "@/auth/authorization/permissions";
import { chatbotActor } from "../../support/ChatbotKnowledgeFixture";

beforeEach(() => vi.clearAllMocks());
const request = (
  values: unknown = {
    publicEnabled: true,
    modelEnabled: false,
    expectedRowVersion: 1,
  },
) =>
  new Request("http://localhost/api/admin/chatbot/settings", {
    method: "PATCH",
    body: JSON.stringify(values),
  });

describe("protected chatbot settings transport", () => {
  it.each([
    { user: null, status: 401 },
    { user: chatbotActor([]), status: 403 },
  ])(
    "denies unauthenticated/ungranted reads and writes with $status before database access",
    async ({ user, status }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      for (const route of [GET, PATCH]) {
        const response = await route(request());
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );

  it("denies changes to read-only staff", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      chatbotActor([permissionCodes.chatbotSettingsReadAll]),
    );
    expect((await PATCH(request())).status).toBe(403);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it.each([
    { publicEnabled: "true", modelEnabled: false, expectedRowVersion: 1 },
    { publicEnabled: true, modelEnabled: false, expectedRowVersion: 0 },
    {
      publicEnabled: true,
      modelEnabled: false,
      expectedRowVersion: 1,
      model: "visitor-model",
    },
  ])(
    "rejects invalid or extra settings before persistence %#",
    async (values) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(
        chatbotActor([permissionCodes.chatbotSettingsUpdateAll]),
      );
      expect((await PATCH(request(values))).status).toBe(400);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
});
