import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import {
  installChatbotRuntimeFixture,
  MemoryChatbotStorage,
} from "../../support/ChatbotRuntimeFixture";
import {
  prepareChatbotKnowledgeRelease,
  approveChatbotKnowledgeRelease,
} from "@/modules/chatbot/application/ServerChatbotKnowledgeService";
import {
  publishChatbotKnowledgeRelease,
  withdrawChatbotKnowledgeRelease,
} from "@/modules/chatbot/application/ServerChatbotReleaseService";
import { readKnowledgeLease } from "@/modules/chatbot/infrastructure/ChatbotReleaseRepository";
import { createKnowledgeRuntime } from "@/modules/chatbot/application/ServerChatbotKnowledgeRuntime";
import { reconcileChatbotSources } from "@/modules/chatbot/application/ServerChatbotSourceJobService";
import { knowledgeTransaction } from "@/modules/chatbot/infrastructure/ChatbotKnowledgeRepository";
import { updateChatbotResources } from "@/modules/chatbot/application/ServerChatbotResourceService";
const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
let storage: MemoryChatbotStorage;
beforeEach(async () => {
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
  if (url) fixture = await installChatbotRuntimeFixture(url);
  storage = new MemoryChatbotStorage();
});
afterEach(async () => {
  if (fixture) await fixture.close();
});
async function approved(faq = "1") {
  await updateChatbotResources(fixture.actor, {
    resourceKeys: [`faq:${faq}`],
    active: true,
  });
  const release = await prepareChatbotKnowledgeRelease(fixture.actor, {
    fundingCallIds: [],
    faqIds: [faq],
  });
  return approveChatbotKnowledgeRelease(fixture.actor, release.id, {
    contentHash: release.contentHash,
  });
}
async function publish(
  release: Awaited<ReturnType<typeof approved>>,
  epoch?: string,
) {
  return publishChatbotKnowledgeRelease(
    fixture.actor,
    release.id,
    {
      contentHash: release.contentHash,
      expectedEpoch: epoch ?? (await readKnowledgeLease()).epoch,
    },
    storage,
  );
}
(url ? describe : describe.skip)(
  "release storage and activation on PostgreSQL",
  () => {
    it("leaves partial uploads inactive and retries unique objects idempotently", async () => {
      const release = await approved();
      const epoch = (await readKnowledgeLease()).epoch;
      storage.failManifest = true;
      await expect(publish(release, epoch)).rejects.toThrow();
      expect((await readKnowledgeLease()).releaseId).toBeNull();
      expect(
        (
          await fixture.pool.query(
            "SELECT status FROM app_chatbot_knowledge_releases WHERE id=$1",
            [release.id],
          )
        ).rows[0].status,
      ).toBe("APPROVED");
      storage.failManifest = false;
      await publish(release, epoch);
      await publish(release, epoch);
      expect(storage.objects.size).toBe(2);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_knowledge_audit WHERE action='ACTIVATED'",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("allows only one of two different concurrent publishers for an epoch", async () => {
      const releases = await Promise.all([approved("1"), approved("2")]);
      const epoch = (await readKnowledgeLease()).epoch;
      const outcomes = await Promise.allSettled(
        releases.map((release) => publish(release, epoch)),
      );
      expect(
        outcomes.filter((outcome) => outcome.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        outcomes.filter((outcome) => outcome.status === "rejected"),
      ).toHaveLength(1);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_release_artifacts",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("rolls back the pointer and artifact registration when activation audit fails", async () => {
      const release = await approved();
      await fixture.pool.query(
        `CREATE FUNCTION fail_activation_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='ACTIVATED' THEN RAISE EXCEPTION 'simulated audit failure'; END IF; RETURN NEW; END; $$; CREATE TRIGGER fail_activation BEFORE INSERT ON app_chatbot_knowledge_audit FOR EACH ROW EXECUTE FUNCTION fail_activation_audit()`,
      );
      await expect(publish(release)).rejects.toThrow();
      expect((await readKnowledgeLease()).releaseId).toBeNull();
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_release_artifacts",
          )
        ).rows[0].n,
      ).toBe(0);
      await fixture.pool.query(
        "DROP TRIGGER fail_activation ON app_chatbot_knowledge_audit",
      );
      await publish(release);
      expect((await readKnowledgeLease()).releaseId).toBe(release.id);
    });
    it("rejects corrupt storage and sources changed after approval", async () => {
      const release = await approved();
      storage.corruptRead = true;
      await expect(publish(release)).rejects.toThrow();
      storage.corruptRead = false;
      await fixture.pool.query(
        "UPDATE cms_faqs SET question='Changed public question' WHERE id=1",
      );
      await expect(publish(release)).rejects.toThrow("Public sources changed");
      expect((await readKnowledgeLease()).releaseId).toBeNull();
    });
    it("blocks both cached instances and old in-flight leases after resource deactivation", async () => {
      const release = await approved();
      await publish(release);
      const first = createKnowledgeRuntime(() => storage);
      const second = createKnowledgeRuntime(() => storage);
      const [a, b] = await Promise.all([first.load(), second.load()]);
      expect(a.records).toEqual(b.records);
      await withdrawChatbotKnowledgeRelease(fixture.actor, release.id);
      await updateChatbotResources(fixture.actor, {
        resourceKeys: ["faq:1"],
        active: false,
      });
      expect((await first.load()).records).toEqual([]);
      expect((await second.load()).records).toEqual([]);
      await expect(
        knowledgeTransaction((transaction) =>
          first.validate(a.lease, transaction),
        ),
      ).rejects.toThrow();
      await expect(publish(release)).rejects.toThrow("withdrawn");
    });
    it("captures source changes atomically and automatically activates one replacement", async () => {
      const release = await approved();
      await publish(release);
      const runtime = createKnowledgeRuntime(() => storage);
      await runtime.load();
      await fixture.pool.query(
        "UPDATE cms_faqs SET question='Replacement question' WHERE id=1",
      );
      const first = await reconcileChatbotSources(() => storage);
      expect(first.candidateId).toBeTruthy();
      const second = await reconcileChatbotSources(() => storage);
      expect(second.candidateId).toBe(first.candidateId);
      expect(
        (
          await fixture.pool.query(
            "SELECT status FROM app_chatbot_knowledge_releases WHERE id=$1",
            [first.candidateId],
          )
        ).rows[0].status,
      ).toBe("APPROVED");
      expect((await readKnowledgeLease()).releaseId).toBe(first.candidateId);
      expect((await runtime.load()).records[0].title).toBe(
        "Replacement question",
      );
      const editor = await fixture.pool.connect();
      await editor.query("BEGIN");
      await editor.query(
        "UPDATE cms_faqs SET question='Rolled back' WHERE id=1",
      );
      await editor.query("ROLLBACK");
      editor.release();
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_source_jobs",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("captures deletion/unpublication and reconciles missed job delivery", async () => {
      const release = await approved();
      await publish(release);
      await fixture.pool.query("DELETE FROM cms_faqs WHERE id=1");
      await fixture.pool.query("DELETE FROM app_chatbot_source_jobs");
      const candidate = await reconcileChatbotSources(() => storage);
      expect(candidate.candidateId).toBeTruthy();
      const row = (
        await fixture.pool.query(
          "SELECT snapshot FROM app_chatbot_knowledge_releases WHERE id=$1",
          [candidate.candidateId],
        )
      ).rows[0];
      expect(row.snapshot.records).toEqual([]);
      expect(row.snapshot.issues).toEqual([]);
      expect(
        (await createKnowledgeRuntime(() => storage).load()).records,
      ).toEqual([]);
    });
  },
);
