import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
import {
  installChatbotRuntimeFixture,
  MemoryChatbotStorage,
} from "../../support/ChatbotRuntimeFixture";
import { chatbotId } from "../../support/ChatbotKnowledgeFixture";
import { updateChatbotResources } from "@/modules/chatbot/application/ServerChatbotResourceService";
import { synchronizeChatbotResources } from "@/modules/chatbot/application/SynchronizeChatbotResources";
import { createKnowledgeRuntime } from "@/modules/chatbot/application/ServerChatbotKnowledgeRuntime";
import { knowledgeTransaction } from "@/modules/chatbot/infrastructure/ChatbotKnowledgeRepository";
import { readKnowledgeLease } from "@/modules/chatbot/infrastructure/ChatbotReleaseRepository";

const url = process.env.CHATBOT_TEST_DATABASE_URL;
let fixture: Awaited<ReturnType<typeof installChatbotRuntimeFixture>>;
let storage: MemoryChatbotStorage;
beforeEach(async () => {
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
  if (!url) return;
  fixture = await installChatbotRuntimeFixture(url);
  storage = new MemoryChatbotStorage();
  await fixture.pool.query(
    "INSERT INTO cms_contact_details VALUES (1,'public@example.test','+264 12345','Public office','08:00–17:00','published','approved','PRIVATE EDITOR NOTES',now())",
  );
});
afterEach(async () => {
  vi.unstubAllEnvs();
  if (fixture) await fixture.close();
});
const save = (resourceKeys: string[], active = true) =>
  updateChatbotResources(fixture.actor, { resourceKeys, active });
const runtime = () => createKnowledgeRuntime(() => storage);

(url ? describe : describe.skip)(
  "automatic published-resource synchronization",
  () => {
    it("uses active Funding, Eligibility, FAQ and Contact resources without another approval", async () => {
      await save([
        `funding:${chatbotId(10)}`,
        `eligibility:${chatbotId(10)}`,
        "faq:1",
        "contact:contact-details",
      ]);
      const loaded = await runtime().load();
      expect(new Set(loaded.records.map((record) => record.kind))).toEqual(
        new Set(["funding-call", "eligibility-criterion", "faq", "contact"]),
      );
      expect(
        loaded.records.find((record) => record.kind === "eligibility-criterion")
          ?.scope?.rulesetVersionId,
      ).toBe(chatbotId(20));
      expect(
        loaded.records.find((record) => record.kind === "contact")?.text,
      ).toContain("public@example.test");
      expect(JSON.stringify(loaded.records)).not.toContain("PRIVATE");
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_knowledge_audit WHERE action='APPROVED'",
          )
        ).rows[0].n,
      ).toBe(0);
      expect(storage.objects.size).toBe(2);
    });
    it("refreshes published changes automatically and ignores updates to inactive resources", async () => {
      await save(["faq:1"]);
      const bot = runtime();
      const original = await bot.load();
      await fixture.pool.query(
        "UPDATE cms_faqs SET question='Updated public question',updated_at='2026-10-10T11:00:00Z' WHERE id=1",
      );
      const changed = await bot.load();
      expect(changed.lease.releaseId).not.toBe(original.lease.releaseId);
      expect(changed.records[0].title).toBe("Updated public question");
      await fixture.pool.query(
        "UPDATE cms_faqs SET question='Inactive FAQ changed' WHERE id=2",
      );
      expect((await bot.load()).lease.releaseId).toBe(changed.lease.releaseId);
    });
    it("removes unpublished or deleted content without staff action", async () => {
      await save(["faq:1", "contact:contact-details"]);
      const bot = runtime();
      const before = await bot.load();
      await fixture.pool.query(
        "UPDATE cms_contact_details SET _status='draft',email='PRIVATE draft email'",
      );
      await fixture.pool.query("DELETE FROM cms_faqs WHERE id=1");
      const after = await bot.load();
      expect(after.records).toEqual([]);
      await expect(
        knowledgeTransaction((transaction) =>
          bot.validate(before.lease, transaction),
        ),
      ).rejects.toThrow();
    });
    it("honors Eligibility activation independently from Funding", async () => {
      await save([`funding:${chatbotId(10)}`]);
      expect(
        (await runtime().load()).records.map((record) => record.kind),
      ).toEqual(["funding-call"]);
      await save([`eligibility:${chatbotId(10)}`]);
      expect(
        (await runtime().load()).records.some(
          (record) => record.kind === "eligibility-criterion",
        ),
      ).toBe(true);
      await save([`eligibility:${chatbotId(10)}`], false);
      expect(
        (await runtime().load()).records.map((record) => record.kind),
      ).toEqual(["funding-call"]);
    });
    it("blocks deactivated content across cached instances and in-flight responses immediately", async () => {
      await save(["faq:1"]);
      const first = runtime();
      const second = runtime();
      const old = await first.load();
      await second.load();
      await save(["faq:1"], false);
      await expect(
        knowledgeTransaction((transaction) =>
          first.validate(old.lease, transaction),
        ),
      ).rejects.toThrow();
      expect((await first.load()).records).toEqual([]);
      expect((await second.load()).records).toEqual([]);
    });
    it("retries partial storage failure using the same immutable generated release", async () => {
      await save(["faq:1"]);
      storage.failManifest = true;
      await expect(runtime().load()).rejects.toThrow("manifest failure");
      expect((await readKnowledgeLease()).releaseId).toBeNull();
      storage.failManifest = false;
      await runtime().load();
      expect(storage.objects.size).toBe(2);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_knowledge_releases",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("deduplicates concurrent synchronization and activation", async () => {
      await save(["faq:1"]);
      const outcomes = await Promise.all([
        synchronizeChatbotResources(() => storage),
        synchronizeChatbotResources(() => storage),
      ]);
      expect(outcomes[0].candidateId).toBe(outcomes[1].candidateId);
      expect(
        (
          await fixture.pool.query(
            "SELECT count(*)::int AS n FROM app_chatbot_knowledge_audit WHERE action='ACTIVATED'",
          )
        ).rows[0].n,
      ).toBe(1);
    });
    it("rejects a selection changed while artifacts are uploading", async () => {
      await save(["faq:1"]);
      const put = storage.putOnce.bind(storage);
      let changed = false;
      storage.putOnce = async (key, bytes) => {
        if (!changed) {
          changed = true;
          await save(["faq:1"], false);
        }
        return put(key, bytes);
      };
      await expect(synchronizeChatbotResources(() => storage)).rejects.toThrow(
        "resources changed",
      );
      expect((await readKnowledgeLease()).releaseId).toBeNull();
      expect((await runtime().load()).records).toEqual([]);
    });
  },
);
