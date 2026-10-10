import "server-only";
import type { DatabaseTransaction } from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  readKnowledgeRelease,
  knowledgeTransaction,
} from "../infrastructure/ChatbotKnowledgeRepository";
import {
  readKnowledgeLease,
  readReleaseStorage,
  type KnowledgeLease,
} from "../infrastructure/ChatbotReleaseRepository";
import {
  createChatbotArtifactStorage,
  type ChatbotArtifactStorage,
} from "../infrastructure/ChatbotArtifactStorage";
import { prepareActiveResourceKnowledge } from "./ServerChatbotResourceService";
import { synchronizeChatbotResources } from "./SynchronizeChatbotResources";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import { verifyChatbotRelease } from "./ChatbotReleaseArtifacts";
import type { KnowledgeRecord } from "../domain/ChatbotKnowledge";

export function createKnowledgeRuntime(
  adapter?: (id: string) => ChatbotArtifactStorage,
) {
  let cached: { lease: KnowledgeLease; records: KnowledgeRecord[] } | null =
    null;
  async function validate(
    lease: KnowledgeLease,
    transaction: DatabaseTransaction,
  ) {
    if (!lease.releaseId)
      throw new ResourceConflictError(
        "Programme guidance is temporarily unavailable.",
      );
    const release = await readKnowledgeRelease(lease.releaseId, transaction);
    const currentSnapshot = await prepareActiveResourceKnowledge(transaction);
    const storage = await readReleaseStorage(release.id, transaction);
    if (
      release.status !== "APPROVED" ||
      storage.revoked ||
      knowledgeFingerprint(release.snapshot) !== release.contentHash ||
      knowledgeFingerprint(currentSnapshot) !== release.contentHash
    ) {
      throw new ResourceConflictError(
        "Published knowledge resources changed. Please retry.",
      );
    }
    const current = await readKnowledgeLease(transaction, true);
    if (current.releaseId !== lease.releaseId || current.epoch !== lease.epoch)
      throw new ResourceConflictError(
        "Programme guidance changed. Please retry.",
      );
    return release;
  }
  return {
    async load() {
      // Refresh from the application's published sources; no second staff approval is needed.
      await synchronizeChatbotResources(adapter);
      const lease = await readKnowledgeLease();
      const release = await knowledgeTransaction((transaction) =>
        validate(lease, transaction),
      );
      if (
        !cached ||
        cached.lease.epoch !== lease.epoch ||
        cached.lease.releaseId !== lease.releaseId
      ) {
        cached = null;
        const artifacts = await readReleaseStorage(release.id);
        if (!artifacts.verified)
          throw new ResourceConflictError(
            "Verified programme guidance is unavailable.",
          );
        const records = await verifyChatbotRelease(
          release,
          artifacts.verified,
          adapter?.(release.id) ?? createChatbotArtifactStorage(release.id),
        );
        cached = { lease, records };
      }
      return { lease, records: cached.records };
    },
    validate,
  };
}

export const chatbotKnowledgeRuntime = createKnowledgeRuntime();
