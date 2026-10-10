import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import {
  startChatbotConversation,
  submitChatbotQuestion,
} from "@/modules/chatbot/application/ServerChatbotConversationService";
import {
  chatbotNoticeVersion,
  chatbotWelcomeMessage,
} from "@/modules/chatbot/domain/ChatbotAnswer";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;

beforeEach(async () => {
  if (url) fixture = await installChatbotRuntimeFixture(url);
});

afterEach(async () => {
  if (fixture) await fixture.close();
});

(url ? describe : describe.skip)("greeting persistence", () => {
  it.each([true, false])(
    "answers and replays greetings without model calls or cases when AI enabled is %s",
    async (modelEnabled) => {
      await fixture.pool.query(
        "UPDATE app_chatbot_settings SET model_enabled=$1",
        [modelEnabled],
      );
      const visitor = await startChatbotConversation(
        { consent: true, noticeVersion: chatbotNoticeVersion },
        "synthetic-network",
      );
      const auth = `Bearer ${visitor.credential}`;
      const dependencies = {
        runtime: { load: vi.fn(), validate: vi.fn() },
        selector: { select: vi.fn() },
      };
      const input = { turnId: chatbotId(800), question: "HI!" };
      const response = await submitChatbotQuestion(
        visitor.id,
        auth,
        input,
        dependencies,
      );
      expect(response).toMatchObject({
        answer: { status: "ANSWERED", text: chatbotWelcomeMessage },
        caseId: null,
        notificationQueued: false,
      });
      expect(
        await submitChatbotQuestion(visitor.id, auth, input, dependencies),
      ).toEqual(response);
      expect(dependencies.runtime.load).not.toHaveBeenCalled();
      expect(dependencies.selector.select).not.toHaveBeenCalled();
      const counts = (
        await fixture.pool.query(
          `SELECT
            (SELECT count(*)::int FROM app_chatbot_cases) AS cases,
            (SELECT count(*)::int FROM app_notification_outbox
             WHERE event_key='chatbot.case.created') AS occurrences,
            (SELECT completed_turns FROM app_chatbot_conversations
             WHERE id=$1) AS turns`,
          [visitor.id],
        )
      ).rows[0];
      expect(counts).toEqual({ cases: 0, occurrences: 0, turns: 1 });
    },
  );
});
