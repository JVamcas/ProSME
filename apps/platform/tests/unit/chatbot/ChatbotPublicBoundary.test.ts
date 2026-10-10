import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
import {
  chatbotNetworkIdentity,
  chatbotPublicRoute,
} from "@/modules/chatbot/api/ChatbotPublicTransport";
import { ChatbotRateLimitError } from "@/modules/chatbot/application/ServerChatbotConversationService";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { chatbotProcessorRoute } from "@/modules/chatbot/api/ChatbotProcessorTransport";
import {
  chatbotSessionSchema,
  chatbotTurnSchema,
} from "@/modules/chatbot/api/ChatbotConversationSchemas";
import { chatbotKnowledgeObjectKeys } from "@/modules/chatbot/infrastructure/ChatbotKnowledgeStorageContract";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
describe("public and processor transport boundaries", () => {
  it("enforces disclosure consent and rejects browser-controlled transcripts/model IDs", () => {
    expect(
      chatbotSessionSchema.safeParse({ consent: false, noticeVersion: "old" })
        .success,
    ).toBe(false);
    expect(
      chatbotTurnSchema.safeParse({
        turnId: chatbotId(80),
        question: "Public question",
        history: [],
        model: "invented",
      }).success,
    ).toBe(false);
  });
  it("shares an untrusted network cap and stores keyed identities for a trusted proxy", () => {
    const request = new Request("http://localhost", {
      headers: { "x-real-ip": "192.0.2.1" },
    });
    vi.stubEnv("CHATBOT_TRUST_PROXY_IP", "false");
    expect(chatbotNetworkIdentity(request)).toBe("shared-public-network");
    vi.stubEnv("CHATBOT_TRUST_PROXY_IP", "true");
    vi.stubEnv("CHATBOT_NETWORK_HASH_SECRET", undefined);
    expect(() => chatbotNetworkIdentity(request)).toThrow("configured");
    vi.stubEnv("CHATBOT_NETWORK_HASH_SECRET", "a".repeat(32));
    const identity = chatbotNetworkIdentity(request);
    expect(identity).toMatch(/^[a-f0-9]{64}$/);
    expect(identity).not.toContain("192.0.2.1");
  });
  it("maps rate/auth failures and never logs unknown errors containing text or credentials", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(
      (
        await chatbotPublicRoute(async () => {
          throw new ChatbotRateLimitError();
        })
      ).status,
    ).toBe(429);
    expect(
      (
        await chatbotPublicRoute(async () => {
          throw new AuthenticationRequiredError();
        })
      ).status,
    ).toBe(401);
    const result = await chatbotPublicRoute(async () => {
      throw new Error("visitor@example.test SECRET provider payload");
    });
    expect(result.status).toBe(500);
    expect(await result.text()).not.toContain("SECRET");
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
  it("requires service authentication before processor side effects", async () => {
    vi.stubEnv("CHATBOT_PROCESSOR_SECRET", "s".repeat(32));
    const operation = vi.fn(async () => ({ processed: true }));
    expect(
      (await chatbotProcessorRoute(new Request("http://localhost"), operation))
        .status,
    ).toBe(401);
    expect(operation).not.toHaveBeenCalled();
    expect(
      (
        await chatbotProcessorRoute(
          new Request("http://localhost", {
            headers: { authorization: `Bearer ${"s".repeat(32)}` },
          }),
          operation,
        )
      ).status,
    ).toBe(200);
  });
  it("allows explicit reuse of the application document bucket with release-scoped keys", () => {
    vi.stubEnv("GCS_DOCUMENTS_BUCKET", "application-bucket");
    expect(
      chatbotKnowledgeObjectKeys(chatbotId(80), "application-bucket"),
    ).toEqual({
      bucket: "application-bucket",
      knowledge: `local/chatbot-knowledge-base/releases/${chatbotId(80)}/knowledge.json`,
      manifest: `local/chatbot-knowledge-base/releases/${chatbotId(80)}/manifest.json`,
    });
  });
});
