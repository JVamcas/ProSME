import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));

import { installChatbotRuntimeFixture } from "../../support/ChatbotRuntimeFixture";
import { chatbotActor, chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getChatbotCases } from "@/modules/chatbot/application/ServerChatbotCaseService";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;

beforeAll(async () => {
  if (!url) return;
  fixture = await installChatbotRuntimeFixture(url);
  const cases = Array.from({ length: 62 }, (_, index) => ({
    id: chatbotId(1000 + index),
    conversationId: chatbotId(2000 + index),
    turnId: chatbotId(3000 + index),
    state: index >= 60 ? "RESOLVED" : "NEW",
    assignedTo: index < 5 ? fixture.actor.id : null,
    expiresAt: index === 59 ? "2000-01-01" : "2099-01-01",
  }));
  await fixture.pool.query(
    `INSERT INTO app_chatbot_cases(id,conversation_id,last_turn_id,state,assigned_to,question,history,reason,source_ids,expires_at,updated_at)
     SELECT x.id::uuid,x."conversationId"::uuid,x."turnId"::uuid,x.state,x."assignedTo"::uuid,
       'PROTECTED QUESTION','[{"text":"PROTECTED HISTORY"}]'::jsonb,'MISSING_EVIDENCE','[]'::jsonb,
       x."expiresAt"::timestamptz,'2026-10-10T12:00:00.123456Z'::timestamptz
     FROM jsonb_to_recordset($1::jsonb) AS x(id text,"conversationId" text,"turnId" text,state text,"assignedTo" text,"expiresAt" text)`,
    [JSON.stringify(cases)],
  );
}, 30000);

afterAll(async () => {
  if (fixture) await fixture.close();
});

(url ? describe : describe.skip)(
  "protected support queue SQL projection",
  () => {
    it("paginates tied timestamps without duplicates and excludes expired cases and history", async () => {
      const first = await getChatbotCases(fixture.actor, { state: "NEW" });
      expect(first.items).toHaveLength(50);
      expect(first.nextCursor?.after).toBe("2026-10-10T12:00:00.123456Z");
      const second = await getChatbotCases(fixture.actor, {
        state: "NEW",
        ...first.nextCursor,
      });
      expect(second.items).toHaveLength(9);
      expect(second.nextCursor).toBeNull();
      const all = [...first.items, ...second.items];
      expect(new Set(all.map((item) => item.id)).size).toBe(59);
      expect(new Set(all.map((item) => item.reference)).size).toBe(59);
      expect(all.every((item) => /^SUP-\d{6,}$/.test(item.reference))).toBe(
        true,
      );
      expect(all[0].id).toBe(chatbotId(1058));
      expect(all.at(-1)?.id).toBe(chatbotId(1000));
      expect(JSON.stringify(all)).not.toMatch(
        /PROTECTED|question|history|contact/,
      );
      expect(all.some((item) => item.id === chatbotId(1059))).toBe(false);
    });

    it("filters actual assignment and state in SQL with readable assignee names", async () => {
      const assigned = chatbotActor([
        permissionCodes.chatbotEscalationReadAssigned,
      ]);
      const queue = await getChatbotCases(assigned, { state: "NEW" });
      expect(queue.items).toHaveLength(5);
      expect(queue.nextCursor).toBeNull();
      expect(queue.items.every((item) => item.assignedTo === assigned.id)).toBe(
        true,
      );
      expect(queue.items.every((item) => item.assigneeName === "Staff")).toBe(
        true,
      );
      expect(
        (await getChatbotCases(assigned, { state: "RESOLVED" })).items,
      ).toEqual([]);
      expect(
        (await getChatbotCases(fixture.actor, { state: "RESOLVED" })).items,
      ).toHaveLength(2);
    });

    it("keeps an all-cases reader's personal queue confined to their assignment", async () => {
      const queue = await getChatbotCases(fixture.actor, {
        scope: "assigned",
        state: "NEW",
      });
      expect(queue.items).toHaveLength(5);
      expect(
        queue.items.every((item) => item.assignedTo === fixture.actor.id),
      ).toBe(true);
      expect(queue.nextCursor).toBeNull();
    });
  },
);
