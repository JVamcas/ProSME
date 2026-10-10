import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { getDatabase } from "@/platform/database/client";
import {
  GET as workspaceGET,
  POST as preparePOST,
} from "@/app/api/admin/chatbot/knowledge/route";
import { GET as sourcesGET } from "@/app/api/admin/chatbot/knowledge/sources/route";
import { GET as releaseGET } from "@/app/api/admin/chatbot/knowledge/[releaseId]/route";
import { POST as approvePOST } from "@/app/api/admin/chatbot/knowledge/[releaseId]/approve/route";
import { chatbotBody } from "@/modules/chatbot/api/ChatbotRouteTransport";
import { chatbotLimits } from "@/modules/chatbot/domain/ChatbotLimits";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";

beforeEach(() => vi.clearAllMocks());
describe("knowledge transport", () => {
  it.each([
    { user: null, status: 401 },
    { user: chatbotActor([]), status: 403 },
  ])(
    "denies protected routes with $status and no database access",
    async ({ user, status }) => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(user);
      for (const operation of [
        workspaceGET,
        preparePOST,
        sourcesGET,
        releaseGET,
        approvePOST,
      ]) {
        const response = await (operation as typeof releaseGET)(
          new Request("http://localhost/api/admin/chatbot/knowledge?kind=faq", {
            method: "POST",
            body: "{}",
          }),
          { params: Promise.resolve({ releaseId: chatbotId(80) }) },
        );
        expect(response.status).toBe(status);
        expect(response.headers.get("cache-control")).toBe("no-store");
      }
      expect(getDatabase).not.toHaveBeenCalled();
    },
  );

  it("validates IDs, source cursors, hashes and malformed JSON without querying", async () => {
    vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor());
    const response = await sourcesGET(
      new Request(
        "http://localhost/api/admin/chatbot/knowledge/sources?kind=faq&after=bad",
      ),
    );
    expect(response.status).toBe(400);
    const prepare = await preparePOST(
      new Request("http://localhost/api/admin/chatbot/knowledge", {
        method: "POST",
        body: "{",
      }),
    );
    expect(prepare.status).toBe(400);
    const approve = await approvePOST(
      new Request("http://localhost/api/admin/chatbot/knowledge", {
        method: "POST",
        body: '{"contentHash":"bad"}',
      }),
    );
    expect(approve.status).toBe(400);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("bounds streamed request bytes without trusting content-length", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: '"' + "x".repeat(chatbotLimits.requestBytes) + '"',
    });
    await expect(chatbotBody(request)).rejects.toThrow(/too large/);
  });
});
