import { installChatbotConversationFixture } from "../../support/ChatbotConversationRuntimeFixture";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import {
  startChatbotConversation,
  submitChatbotQuestion,
  setChatbotConversationContact,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";
import { withdrawChatbotKnowledgeRelease } from "@/modules/chatbot/application/ServerChatbotReleaseService";
const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
let dependencies: Awaited<
  ReturnType<typeof installChatbotConversationFixture>
>["dependencies"];
let releaseId: string;
beforeEach(async () => {
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
  if (!url) return;
  ({ fixture, releaseId, dependencies } =
    await installChatbotConversationFixture(url));
});
afterEach(async () => {
  if (fixture) await fixture.close();
});
const session = () =>
  startChatbotConversation(
    { consent: true, noticeVersion: chatbotNoticeVersion },
    "synthetic-network",
  );
const question = (turnId = chatbotId(800), text = "Public question 1") => ({
  turnId,
  question: text,
});
(url ? describe : describe.skip)(
  "protected server-controlled conversations",
  () => {
    it("creates one case/audit/occurrence for retries and updates one open case on subsequent unresolved turns", async () => {
      const visitor = await session();
      const auth = `Bearer ${visitor.credential}`;
      const first = await submitChatbotQuestion(
        visitor.id,
        auth,
        question(chatbotId(800), "Unsupported weather query"),
        dependencies,
      );
      expect(first.answer.reason).toBe("MISSING_EVIDENCE");
      expect(first.caseId).toBeTruthy();
      expect(first.caseReference).toMatch(/^SUP-\d{6,}$/);
      expect(first.notificationQueued).toBe(true);
      expect(
        await submitChatbotQuestion(
          visitor.id,
          auth,
          question(chatbotId(800), "Unsupported weather query"),
          dependencies,
        ),
      ).toEqual(first);
      const second = await submitChatbotQuestion(
        visitor.id,
        auth,
        question(chatbotId(801), "Another unknown query"),
        dependencies,
      );
      expect(second.caseId).toBe(first.caseId);
      expect(second.caseReference).toBe(first.caseReference);
      const counts = (
        await fixture.pool.query(
          `SELECT (SELECT count(*)::int FROM app_chatbot_cases) AS cases,(SELECT count(*)::int FROM app_chatbot_case_audit WHERE turn_id IS NOT NULL) AS audits,(SELECT count(*)::int FROM app_notification_outbox WHERE event_key='chatbot.case.created') AS occurrences`,
        )
      ).rows[0];
      expect(counts).toEqual({ cases: 1, audits: 2, occurrences: 1 });
      const context = (
        await fixture.pool.query(
          "SELECT context FROM app_notification_outbox WHERE event_key='chatbot.case.created'",
        )
      ).rows[0].context;
      expect(context.caseReference).toBe(first.caseReference);
      expect(context).not.toHaveProperty("question");
      expect(context).not.toHaveProperty("history");
    });
    it("rolls back case/history/occurrence together and allows an immediate retry after audit failure", async () => {
      const visitor = await session();
      await fixture.pool.query(
        `CREATE FUNCTION fail_case_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated audit failure'; END; $$; CREATE TRIGGER fail_case BEFORE INSERT ON app_chatbot_case_audit FOR EACH ROW EXECUTE FUNCTION fail_case_audit()`,
      );
      await expect(
        submitChatbotQuestion(
          visitor.id,
          `Bearer ${visitor.credential}`,
          question(chatbotId(800), "Unknown weather"),
          dependencies,
        ),
      ).rejects.toThrow();
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_cases",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_notification_outbox WHERE event_key='chatbot.case.created'",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(
        (
          await fixture.pool.query(
            "SELECT history FROM app_chatbot_conversations WHERE id=$1",
            [visitor.id],
          )
        ).rows[0].history,
      ).toEqual([]);
      await fixture.pool.query(
        "DROP TRIGGER fail_case ON app_chatbot_case_audit",
      );
      expect(
        (
          await submitChatbotQuestion(
            visitor.id,
            `Bearer ${visitor.credential}`,
            question(chatbotId(800), "Unknown weather"),
            dependencies,
          )
        ).caseId,
      ).toBeTruthy();
    });
    it("denies cross-conversation tokens, expiry, caller transcripts and changed idempotent input", async () => {
      const a = await session();
      const b = await session();
      await expect(
        submitChatbotQuestion(
          b.id,
          `Bearer ${a.credential}`,
          question(),
          dependencies,
        ),
      ).rejects.toThrow("Authentication");
      await expect(
        submitChatbotQuestion(
          a.id,
          `Bearer ${a.credential}`,
          { ...question(), history: [{ text: "invented history" }] },
          dependencies,
        ),
      ).rejects.toThrow();
      await submitChatbotQuestion(
        a.id,
        `Bearer ${a.credential}`,
        question(),
        dependencies,
      );
      await expect(
        submitChatbotQuestion(
          a.id,
          `Bearer ${a.credential}`,
          question(chatbotId(800), "Changed question"),
          dependencies,
        ),
      ).rejects.toThrow("already used");
      await fixture.pool.query(
        "UPDATE app_chatbot_conversations SET expires_at=now()-interval '1 second' WHERE id=$1",
        [a.id],
      );
      await expect(
        submitChatbotQuestion(
          a.id,
          `Bearer ${a.credential}`,
          question(chatbotId(801)),
          dependencies,
        ),
      ).rejects.toThrow("Authentication");
    });
    it("uses screened server history and keeps optional contact out of provider requests", async () => {
      const visitor = await session();
      const auth = `Bearer ${visitor.credential}`;
      await submitChatbotQuestion(
        visitor.id,
        auth,
        question(
          chatbotId(800),
          "Unknown issue visitor@example.test +264 812 345 678",
        ),
        dependencies,
      );
      await setChatbotConversationContact(visitor.id, auth, {
        name: "Visitor name",
        email: "contact@example.test",
        consent: true,
      });
      await submitChatbotQuestion(
        visitor.id,
        auth,
        question(chatbotId(801)),
        dependencies,
      );
      const outgoing = JSON.stringify(dependencies.selector.select.mock.calls);
      expect(outgoing).not.toContain("visitor@example.test");
      expect(outgoing).not.toContain("contact@example.test");
      expect(outgoing).not.toContain("Visitor name");
      expect(
        dependencies.selector.select.mock.calls[0][0].context[0],
      ).toContain("[contact removed]");
      const history = (
        await fixture.pool.query("SELECT history FROM app_chatbot_cases")
      ).rows[0].history;
      expect(JSON.stringify(history)).not.toContain("visitor@example.test");
    });
    it("blocks in-flight withdrawal and creates a service-failure case instead of a stale answer", async () => {
      const visitor = await session();
      let entered!: () => void;
      const started = new Promise<void>((resolve) => {
        entered = resolve;
      });
      let resolveModel!: (value: unknown) => void;
      dependencies.selector.select.mockImplementation(() => {
        entered();
        return new Promise((resolve) => {
          resolveModel = resolve;
        });
      });
      const pending = submitChatbotQuestion(
        visitor.id,
        `Bearer ${visitor.credential}`,
        question(),
        dependencies,
      );
      await started;
      await withdrawChatbotKnowledgeRelease(fixture.actor, releaseId);
      resolveModel({ status: "ANSWER", passageIds: ["faq:1"] });
      const result = await pending;
      expect(result.answer.reason).toBe("SERVICE_FAILURE");
      expect(result.answer.passages).toEqual([]);
      expect(result.caseId).toBeTruthy();
    });
    it("persists one answered turn for concurrent duplicate attempts and enforces a shared per-conversation rate cap", async () => {
      const visitor = await session();
      const auth = `Bearer ${visitor.credential}`;
      const responses = await Promise.allSettled([
        submitChatbotQuestion(visitor.id, auth, question(), dependencies),
        submitChatbotQuestion(visitor.id, auth, question(), dependencies),
      ]);
      expect(
        responses.some((response) => response.status === "fulfilled"),
      ).toBe(true);
      expect(
        (
          await fixture.pool.query(
            "SELECT completed_turns FROM app_chatbot_conversations",
          )
        ).rows[0].completed_turns,
      ).toBe(1);
      for (let i = 1; i <= 8; i++)
        await submitChatbotQuestion(
          visitor.id,
          auth,
          question(chatbotId(800 + i)),
          dependencies,
        );
      await expect(
        submitChatbotQuestion(
          visitor.id,
          auth,
          question(chatbotId(809)),
          dependencies,
        ),
      ).rejects.toThrow("wait a minute");
    });
  },
);
