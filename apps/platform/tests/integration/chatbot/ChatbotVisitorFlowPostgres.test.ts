import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    notificationBrandingLogoUrl: "cid:test-logo",
    loadNotificationBrandingLogoAttachment: vi.fn(async () => ({
      filename: "logo.png",
      content: Buffer.from("synthetic"),
    })),
  }),
);
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({
    APP_PUBLIC_URL: "https://platform.example.test",
  }),
  getDeploymentEnvironment: () => "test",
}));
const runtime = vi.hoisted(() => ({
  load: vi.fn(),
  validate: vi.fn(),
  select: vi.fn(),
}));
vi.mock(
  "@/modules/chatbot/application/ServerChatbotKnowledgeRuntime",
  async (original) => ({
    ...(await original<
      typeof import("@/modules/chatbot/application/ServerChatbotKnowledgeRuntime")
    >()),
    chatbotKnowledgeRuntime: { load: runtime.load, validate: runtime.validate },
  }),
);
vi.mock(
  "@/modules/chatbot/infrastructure/VertexChatbotPassageSelector",
  () => ({
    createVertexChatbotSelector: () => ({ select: runtime.select }),
  }),
);
import { installChatbotConversationFixture } from "../../support/ChatbotConversationRuntimeFixture";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { clientChatbotConversationService as client } from "@/modules/chatbot/ClientChatbotConversationService";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import {
  GET as noticeGET,
  POST as sessionPOST,
} from "@/app/api/chatbot/sessions/route";
import { POST as turnPOST } from "@/app/api/chatbot/sessions/[conversationId]/turns/route";
import { POST as contactPOST } from "@/app/api/chatbot/sessions/[conversationId]/contact/route";
import {
  GET as caseGET,
  PATCH as casePATCH,
} from "@/app/api/admin/chatbot/cases/[caseId]/route";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let installed:
  Awaited<ReturnType<typeof installChatbotConversationFixture>> | undefined;
afterEach(async () => {
  if (installed) await installed.fixture.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

(url ? describe : describe.skip)(
  "visitor HTTP to authorized staff resolution",
  () => {
    it("answers a known question, saves an unknown case/contact, dispatches and resolves without duplicate notification", async () => {
      vi.stubEnv("CHATBOT_TRUST_PROXY_IP", "false");
      vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
      installed = await installChatbotConversationFixture(url!);
      const { fixture, dependencies } = installed;
      runtime.load.mockImplementation(dependencies.runtime.load);
      runtime.validate.mockImplementation(dependencies.runtime.validate);
      runtime.select.mockImplementation(dependencies.selector.select);
      vi.stubGlobal(
        "fetch",
        vi.fn(async (path: string, init?: RequestInit) => {
          const request = new Request(
            `https://platform.example.test${path}`,
            init,
          );
          if (path === "/api/chatbot/sessions") {
            return init?.method === "POST" ? sessionPOST(request) : noticeGET();
          }
          const id = path.split("/")[4];
          const context = { params: Promise.resolve({ conversationId: id }) };
          return path.endsWith("/contact")
            ? contactPOST(request, context)
            : turnPOST(request, context);
        }),
      );

      const notice = await client.notice();
      expect(notice.enabled).toBe(true);
      const session = await client.start({
        consent: true,
        noticeVersion: chatbotNoticeVersion,
      });
      const known = await client.question(session, {
        turnId: chatbotId(800),
        question: "Public question 1",
      });
      expect(known.answer.status).toBe("ANSWERED");
      expect(known.answer.passages[0].url).toBe("/faq");
      expect(known.caseId).toBeNull();

      const input = {
        turnId: chatbotId(801),
        question: "Unsupported weather query",
      };
      const unknown = await client.question(session, input);
      expect(unknown.answer.reason).toBe("MISSING_EVIDENCE");
      expect(unknown).not.toHaveProperty("notificationQueued");
      expect(unknown.caseReference).toMatch(/^SUP-\d{6,}$/);
      expect(await client.question(session, input)).toEqual(unknown);
      await client.contact(session, {
        name: "Synthetic visitor",
        email: "visitor@example.test",
        consent: true,
      });

      const send = vi.fn(async () => ({
        providerMessageId: "cb6-synthetic-delivery",
      }));
      const dispatch = await processNotificationBatch({
        batchSize: 10,
        emailSender: { send },
        executionTimeoutMs: 30000,
        lockTimeoutMs: 60000,
        owner: "cb6-fixture-worker",
      });
      expect(dispatch.sent).toBe(1);
      expect(send).toHaveBeenCalledTimes(1);
      const message = JSON.stringify(send.mock.calls);
      expect(message).toContain(unknown.caseReference);
      expect(message).toContain(`/admin/chatbot/cases/${unknown.caseId}`);
      expect(message).not.toContain(input.question);
      expect(message).not.toContain("visitor@example.test");

      const context = { params: Promise.resolve({ caseId: unknown.caseId! }) };
      const staffRequest = new Request(
        "https://platform.example.test/api/admin/chatbot/cases",
      );
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(chatbotActor([]));
      const denied = await caseGET(staffRequest, context);
      expect(denied.status).toBe(403);
      expect(await denied.text()).not.toContain(input.question);
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(fixture.actor);
      const read = await caseGET(staffRequest, context);
      const support = (await read.json()).data;
      expect(support.reference).toBe(unknown.caseReference);
      expect(support.history).toHaveLength(4);
      expect(support.contact.email).toBe("visitor@example.test");
      const resolved = await casePATCH(
        new Request(staffRequest.url, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedRowVersion: support.rowVersion,
            state: "RESOLVED",
            resolutionNote: "Synthetic support handover completed.",
          }),
        }),
        context,
      );
      expect(resolved.status).toBe(200);
      expect((await resolved.json()).data.state).toBe("RESOLVED");
      const counts = (
        await fixture.pool.query(`
      SELECT (SELECT count(*)::int FROM app_chatbot_cases) AS cases,
      (SELECT count(*)::int FROM app_notification_outbox WHERE event_key='chatbot.case.created') AS occurrences,
      (SELECT count(*)::int FROM app_chatbot_cases WHERE state='RESOLVED') AS resolved
    `)
      ).rows[0];
      expect(counts).toEqual({ cases: 1, occurrences: 1, resolved: 1 });
    }, 30_000);
  },
);
