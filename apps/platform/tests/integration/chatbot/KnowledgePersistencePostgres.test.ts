import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth/authorization/current-user", () => ({
  resolveUserFromHeaders: vi.fn(),
}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import { installChatbotKnowledgeDatabaseFixture } from "../../support/ChatbotKnowledgeDatabaseFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import {
  prepareChatbotKnowledgeRelease,
  approveChatbotKnowledgeRelease,
  getChatbotKnowledgeSources,
} from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import { POST as preparePOST } from "@/app/api/admin/chatbot/knowledge/route";
import { POST as approvePOST } from "@/app/api/admin/chatbot/knowledge/[releaseId]/approve/route";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotKnowledgeDatabaseFixture>>;
beforeAll(async () => {
  if (url) fixture = await installChatbotKnowledgeDatabaseFixture(url);
});
afterAll(async () => {
  if (fixture) await fixture.close();
});

(url ? describe : describe.skip)(
  "chatbot persistence on isolated PostgreSQL schema",
  () => {
    it("retires manual preparation and approval HTTP actions", async () => {
      vi.mocked(resolveUserFromHeaders).mockResolvedValue(fixture.actor);
      const request = () =>
        new Request("http://localhost/api/admin/chatbot/knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fundingCallIds: [], faqIds: ["10"] }),
        });
      for (const operation of [preparePOST, approvePOST]) {
        const response = await operation(request());
        expect(response.status).toBe(400);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(JSON.stringify(await response.json())).toContain(
          "Application publication is sufficient",
        );
      }
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_knowledge_releases",
          )
        ).rows[0].n,
      ).toBe(0);
    });
    it("applies its migration twice and exports 123 FAQs without drafts or private review notes", async () => {
      const selected = Array.from({ length: 125 }, (_, index) =>
        String(index + 1),
      );
      const release = await prepareChatbotKnowledgeRelease(fixture.actor, {
        fundingCallIds: [
          chatbotId(10),
          chatbotId(11),
          chatbotId(12),
          chatbotId(13),
        ],
        faqIds: selected,
      });
      expect(
        release.snapshot.records.filter((record) => record.kind === "faq"),
      ).toHaveLength(123);
      expect(
        release.snapshot.records.filter(
          (record) => record.kind === "funding-call",
        ),
      ).toHaveLength(2);
      expect(
        release.snapshot.issues.filter(
          (issue) => issue.code === "MISSING_SOURCE",
        ),
      ).toHaveLength(4);
      expect(JSON.stringify(release.snapshot)).not.toMatch(
        /PRIVATE-|PRIVATE REVIEW|PRIVATE SCREENING/,
      );
      const eligibility = release.snapshot.records.filter(
        (record) => record.kind === "eligibility-criterion",
      );
      expect(
        eligibility.map((record) => record.scope?.rulesetVersionId),
      ).toEqual([chatbotId(20), chatbotId(21)]);
      expect(release.status).toBe("PREPARED");
    });

    it("paginates source selection with stable boundaries and filters searches in SQL", async () => {
      const page = await getChatbotKnowledgeSources(fixture.actor, {
        kind: "faq",
      });
      expect(page.items).toHaveLength(50);
      expect(page.nextCursor).toBe("50");
      const next = await getChatbotKnowledgeSources(fixture.actor, {
        kind: "faq",
        after: page.nextCursor!,
      });
      expect(next.items[0].id).toBe("51");
      const last = await getChatbotKnowledgeSources(fixture.actor, {
        kind: "faq",
        after: "100",
      });
      expect(last.items).toHaveLength(23);
      expect(last.nextCursor).toBeNull();
      const search = await getChatbotKnowledgeSources(fixture.actor, {
        kind: "faq",
        search: "Question 123?",
      });
      expect(search.items.map((item) => item.id)).toEqual(["123"]);
      const calls = await getChatbotKnowledgeSources(fixture.actor, {
        kind: "funding-call",
      });
      expect(calls.items.map((item) => item.id)).toEqual([
        chatbotId(10),
        chatbotId(11),
      ]);
    });

    it("serializes concurrent approvals and creates exactly one approval/audit", async () => {
      const release = await prepareChatbotKnowledgeRelease(fixture.actor, {
        fundingCallIds: [chatbotId(10)],
        faqIds: ["1"],
      });
      const input = { contentHash: release.contentHash };
      const results = await Promise.all([
        approveChatbotKnowledgeRelease(fixture.actor, release.id, input),
        approveChatbotKnowledgeRelease(fixture.actor, release.id, input),
      ]);
      expect(results.every((result) => result.status === "APPROVED")).toBe(
        true,
      );
      const approval = await fixture.pool.query(
        "SELECT count(*)::int AS count FROM app_chatbot_knowledge_approvals WHERE release_id = $1",
        [release.id],
      );
      const audit = await fixture.pool.query(
        "SELECT count(*)::int AS count FROM app_chatbot_knowledge_audit WHERE release_id = $1 AND action = 'APPROVED'",
        [release.id],
      );
      expect(approval.rows[0].count).toBe(1);
      expect(audit.rows[0].count).toBe(1);
      await expect(
        fixture.pool.query(
          "UPDATE app_chatbot_knowledge_releases SET snapshot = '{}' WHERE id = $1",
          [release.id],
        ),
      ).rejects.toThrow(/immutable/);
      await expect(
        fixture.pool.query(
          "UPDATE app_chatbot_knowledge_approvals SET content_hash = $1 WHERE release_id = $2",
          ["a".repeat(64), release.id],
        ),
      ).rejects.toThrow(/immutable/);
    });

    it("rejects a concurrent source change committed while approval waits for source locks", async () => {
      const release = await prepareChatbotKnowledgeRelease(fixture.actor, {
        fundingCallIds: [chatbotId(10)],
        faqIds: ["2"],
      });
      const writer = await fixture.pool.connect();
      try {
        await writer.query("BEGIN");
        await writer.query(
          "UPDATE app_eligibility_self_check_questions SET prompt = 'Changed while approving' WHERE input_definition_id = $1",
          [chatbotId(60)],
        );
        const approval = approveChatbotKnowledgeRelease(
          fixture.actor,
          release.id,
          { contentHash: release.contentHash },
        );
        // Attach the rejection assertion immediately, before releasing the competing write.
        const rejected = expect(approval).rejects.toThrow(/changed/);
        const writerId = (await writer.query("SELECT pg_backend_pid() AS id"))
          .rows[0].id;
        await expect
          .poll(
            async () => {
              const waiting = await fixture.pool.query(
                "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE $1 = ANY(pg_blocking_pids(pid))) AS blocked",
                [writerId],
              );
              return waiting.rows[0].blocked;
            },
            { timeout: 2000, interval: 10 },
          )
          .toBe(true);
        await writer.query("COMMIT");
        await rejected;
        const saved = await fixture.pool.query(
          "SELECT status FROM app_chatbot_knowledge_releases WHERE id = $1",
          [release.id],
        );
        expect(saved.rows[0].status).toBe("PREPARED");
      } finally {
        await writer.query("ROLLBACK");
        writer.release();
        await fixture.pool.query(
          "UPDATE app_eligibility_self_check_questions SET prompt = 'How many employees?' WHERE input_definition_id = $1",
          [chatbotId(60)],
        );
      }
    });

    it("rolls back approval, release status and audit together if the audit write fails", async () => {
      const release = await prepareChatbotKnowledgeRelease(fixture.actor, {
        fundingCallIds: [],
        faqIds: ["3"],
      });
      await fixture.pool.query(`
      CREATE FUNCTION fail_chatbot_test_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture audit failure'; END; $$;
      CREATE TRIGGER fail_chatbot_test_audit BEFORE INSERT ON app_chatbot_knowledge_audit FOR EACH ROW EXECUTE FUNCTION fail_chatbot_test_audit();
    `);
      try {
        await expect(
          approveChatbotKnowledgeRelease(fixture.actor, release.id, {
            contentHash: release.contentHash,
          }),
        ).rejects.toMatchObject({
          cause: expect.objectContaining({ message: "fixture audit failure" }),
        });
        const saved = await fixture.pool.query(
          "SELECT status FROM app_chatbot_knowledge_releases WHERE id = $1",
          [release.id],
        );
        const approval = await fixture.pool.query(
          "SELECT release_id FROM app_chatbot_knowledge_approvals WHERE release_id = $1",
          [release.id],
        );
        expect(saved.rows[0].status).toBe("PREPARED");
        expect(approval.rows).toEqual([]);
      } finally {
        await fixture.pool.query(
          "DROP TRIGGER fail_chatbot_test_audit ON app_chatbot_knowledge_audit; DROP FUNCTION fail_chatbot_test_audit();",
        );
      }
    });
  },
);
