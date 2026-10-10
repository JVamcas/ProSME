import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getDatabase } from "@/platform/database/client";
import { GET, PATCH } from "@/app/api/admin/chatbot/knowledge/resources/route";
import { permissionCodes } from "@/auth/authorization/permissions";
import { chatbotActor } from "../../support/ChatbotKnowledgeFixture";

beforeEach(() => vi.clearAllMocks());
const request = (values: unknown) =>
  new Request("http://localhost/api/admin/chatbot/knowledge/resources", {
    method: "PATCH",
    body: JSON.stringify(values),
  });

describe("resource table transport and permissions", () => {
  it.each([
    { user: null, status: 401 },
    { user: chatbotActor([]), status: 403 },
  ])(
    "denies reads and writes with $status before database access",
    async ({ user, status }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      for (const operation of [GET, PATCH]) {
        const response = await operation(
          request({ resourceKeys: ["faq:1"], active: true }),
        );
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it.each([
    { active: true, grant: permissionCodes.chatbotKnowledgeDeactivateAll },
    { active: false, grant: permissionCodes.chatbotKnowledgeActivateAll },
  ])(
    "separates activation and deactivation grants %#",
    async ({ active, grant }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(
        chatbotActor([permissionCodes.chatbotKnowledgeReadAll, grant]),
      );
      expect(
        (await PATCH(request({ resourceKeys: ["faq:1"], active }))).status,
      ).toBe(403);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it.each([
    { resourceKeys: [], active: true },
    { resourceKeys: ["faq:1", "faq:1"], active: true },
    { resourceKeys: ["contact:visitor-details"], active: true },
    { resourceKeys: ["funding:not-a-uuid"], active: true },
    { resourceKeys: ["faq:1"], active: "true" },
    { resourceKeys: ["faq:1"], active: true, content: "Private override" },
  ])("rejects invalid selection and invented content %#", async (values) => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor());
    expect((await PATCH(request(values))).status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it.each(["page=0", "pageSize=500", "after=faq:1"])(
    "rejects invalid pagination %s",
    async (query) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor());
      expect(
        (
          await GET(
            new Request(
              `http://localhost/api/admin/chatbot/knowledge/resources?${query}`,
            ),
          )
        ).status,
      ).toBe(400);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
});
