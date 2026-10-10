import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MemoryChatbotStorage } from "../../support/ChatbotRuntimeFixture";
import {
  chatbotId,
  chatbotSourceFixture,
} from "../../support/ChatbotKnowledgeFixture";
import { prepareChatbotKnowledge } from "@/modules/chatbot/application/PrepareChatbotKnowledge";
import { knowledgeFingerprint } from "@/modules/chatbot/infrastructure/KnowledgeFingerprint";
import {
  uploadChatbotRelease,
  verifyChatbotRelease,
} from "@/modules/chatbot/application/ChatbotReleaseArtifacts";
import type { KnowledgeRelease } from "@/modules/chatbot/domain/ChatbotKnowledge";
const snapshot = prepareChatbotKnowledge(
  { fundingCallIds: [chatbotId(10)], faqIds: ["1"] },
  chatbotSourceFixture(),
);
const release: KnowledgeRelease = {
  id: chatbotId(80),
  snapshot,
  contentHash: knowledgeFingerprint(snapshot),
  preparedAt: "2026-10-10T00:00:00Z",
  approvedAt: "2026-10-10T00:01:00Z",
  status: "APPROVED",
};
beforeEach(() => {
  vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", "chatbot-fixture-bucket");
});
describe("immutable release artifacts", () => {
  it("retries a partial upload without overwriting the knowledge object", async () => {
    const storage = new MemoryChatbotStorage();
    storage.failManifest = true;
    await expect(uploadChatbotRelease(release, storage)).rejects.toThrow();
    const before = [...storage.objects.values()][0];
    storage.failManifest = false;
    const verified = await uploadChatbotRelease(release, storage);
    expect(storage.objects.size).toBe(2);
    expect([...storage.objects.values()][0].generation).toBe(before.generation);
    expect(await verifyChatbotRelease(release, verified, storage)).toEqual(
      snapshot.records,
    );
    expect(await uploadChatbotRelease(release, storage)).toEqual(verified);
  });
  it("rejects checksum, generation, key and exact-content mismatches", async () => {
    const storage = new MemoryChatbotStorage();
    const verified = await uploadChatbotRelease(release, storage);
    storage.corruptRead = true;
    await expect(
      verifyChatbotRelease(release, verified, storage),
    ).rejects.toThrow();
    storage.corruptRead = false;
    await expect(
      verifyChatbotRelease(
        release,
        {
          ...verified,
          knowledge: { ...verified.knowledge, generation: "999" },
        },
        storage,
      ),
    ).rejects.toThrow();
    await expect(
      verifyChatbotRelease(
        release,
        { ...verified, releaseId: chatbotId(81) },
        storage,
      ),
    ).rejects.toThrow();
    await expect(
      verifyChatbotRelease(
        { ...release, contentHash: "b".repeat(64) },
        verified,
        storage,
      ),
    ).rejects.toThrow();
  });
  it("uploads and verifies release-scoped public artifacts using the existing bucket configuration", async () => {
    vi.stubEnv("GCS_CHATBOT_KNOWLEDGE_BUCKET", undefined);
    vi.stubEnv("GCS_DOCUMENTS_BUCKET", "application-bucket");
    const storage = new MemoryChatbotStorage();
    const verified = await uploadChatbotRelease(release, storage);
    expect([...storage.objects.keys()]).toEqual([
      `local/chatbot-knowledge-base/releases/${release.id}/knowledge.json`,
      `local/chatbot-knowledge-base/releases/${release.id}/manifest.json`,
    ]);
    expect(await verifyChatbotRelease(release, verified, storage)).toEqual(
      snapshot.records,
    );
  });
});
