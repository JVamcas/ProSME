import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
import { getDatabase } from "@/platform/database/client";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { POST } from "@/app/api/admin/chatbot/knowledge/documents/route";
import { GET } from "@/app/api/admin/chatbot/knowledge/documents/[documentId]/route";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";

beforeEach(() => vi.clearAllMocks());

describe("knowledge document transport permissions", () => {
  it.each([
    { actor: null, status: 401 },
    { actor: chatbotActor([]), status: 403 },
    {
      actor: chatbotActor([permissionCodes.chatbotKnowledgeReadAll]),
      status: 403,
    },
    {
      actor: chatbotActor([permissionCodes.chatbotKnowledgeDocumentUploadAll]),
      status: 403,
    },
  ])(
    "rejects unauthorized upload before consuming the body %#",
    async ({ actor, status }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(actor);
      const request = new Request(
        "http://localhost/api/admin/chatbot/knowledge/documents",
        {
          method: "POST",
          body: "private document",
          headers: { "x-file-name": "guide.txt" },
        },
      );
      expect((await POST(request)).status).toBe(status);
      expect(request.bodyUsed).toBe(false);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it("requires staff knowledge-read permission for inactive document preview", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor([]));
    const result = await GET(new Request("http://localhost/preview"), {
      params: Promise.resolve({ documentId: chatbotId(700) }),
    });
    expect(result.status).toBe(403);
    expect(getDatabase).not.toHaveBeenCalled();
  });
  it.each(["guide.exe", "..%2Fguide.txt", "bad%0Aname.txt", "%FF"])(
    "rejects invalid document name %s",
    async (fileName) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(
        chatbotActor([
          permissionCodes.chatbotKnowledgeReadAll,
          permissionCodes.chatbotKnowledgeDocumentUploadAll,
        ]),
      );
      const result = await POST(
        new Request("http://localhost/upload", {
          method: "POST",
          body: "Public guide",
          headers: { "x-file-name": fileName },
        }),
      );
      expect(result.status).toBe(400);
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );
  it("bounds the request while streaming even without a content-length header", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(
      chatbotActor([
        permissionCodes.chatbotKnowledgeReadAll,
        permissionCodes.chatbotKnowledgeDocumentUploadAll,
      ]),
    );
    const result = await POST(
      new Request("http://localhost/upload", {
        method: "POST",
        body: new Uint8Array(5 * 1024 * 1024 + 1),
        headers: { "x-file-name": "guide.txt" },
      }),
    );
    expect(result.status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
