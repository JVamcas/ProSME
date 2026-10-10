import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { installChatbotConversationFixture } from "../../support/ChatbotConversationRuntimeFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import {
  startChatbotConversation,
  submitChatbotQuestion,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import { chatbotNoticeVersion } from "@/modules/chatbot/domain/ChatbotAnswer";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let installed: Awaited<ReturnType<typeof installChatbotConversationFixture>>;
let fixture: typeof installed.fixture;
let dependencies: typeof installed.dependencies;

beforeEach(async () => {
  if (!url) return;
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
  installed = await installChatbotConversationFixture(url);
  ({ fixture, dependencies } = installed);
});

afterEach(async () => {
  if (installed) await installed.fixture.close();
  vi.unstubAllEnvs();
});

const session = () =>
  startChatbotConversation(
    { consent: true, noticeVersion: chatbotNoticeVersion },
    "synthetic-network",
  );
const question = (turnId: string, text: string) => ({ turnId, question: text });

(url ? describe : describe.skip)("support ticket reference migration", () => {
  it("backfills existing tickets and replay responses repeatably without truncating large ticket numbers", async () => {
    const visitor = await session();
    const auth = `Bearer ${visitor.credential}`;
    const input = question(chatbotId(800), "Unknown weather query");
    const original = await submitChatbotQuestion(
      visitor.id,
      auth,
      input,
      dependencies,
    );
    await submitChatbotQuestion(
      visitor.id,
      auth,
      question(chatbotId(801), "Hello"),
      dependencies,
    );
    await fixture.pool.query(
      "ALTER TABLE app_chatbot_cases DROP COLUMN case_number",
    );
    await fixture.pool.query(
      "UPDATE app_chatbot_turns SET response = response - 'caseReference'",
    );
    const migration = await readFile(
      new URL(
        "../../../drizzle/0193_chatbot_case_references.sql",
        import.meta.url,
      ),
      "utf8",
    );
    await fixture.pool.query(migration);
    const replay = await submitChatbotQuestion(
      visitor.id,
      auth,
      input,
      dependencies,
    );
    expect(replay.caseId).toBe(original.caseId);
    expect(replay.caseReference).toBe("SUP-000001");
    expect(replay.answer).toEqual(original.answer);
    await fixture.pool.query(migration);
    expect(
      await submitChatbotQuestion(visitor.id, auth, input, dependencies),
    ).toEqual(replay);
    const greeting = await submitChatbotQuestion(
      visitor.id,
      auth,
      question(chatbotId(801), "Hello"),
      dependencies,
    );
    expect(greeting.caseReference).toBeNull();
    await fixture.pool.query(
      "SELECT setval(pg_get_serial_sequence('app_chatbot_cases','case_number'), 999999, true)",
    );
    const another = await session();
    const next = await submitChatbotQuestion(
      another.id,
      `Bearer ${another.credential}`,
      question(chatbotId(802), "Another unknown weather query"),
      dependencies,
    );
    expect(next.caseReference).toBe("SUP-1000000");
  });
});
