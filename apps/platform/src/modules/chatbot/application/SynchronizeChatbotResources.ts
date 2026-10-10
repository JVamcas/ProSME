import "server-only";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  knowledgeTransaction,
  insertPreparedKnowledge,
  insertKnowledgeApproval,
  readKnowledgeRelease,
} from "../infrastructure/ChatbotKnowledgeRepository";
import {
  readKnowledgeLease,
  readReleaseStorage,
  activateKnowledgeRelease,
  nextKnowledgeSourceJob,
  finishKnowledgeSourceJob,
} from "../infrastructure/ChatbotReleaseRepository";
import {
  findAutomaticKnowledge,
  lockResourceSynchronization,
} from "../infrastructure/ChatbotResourceSyncRepository";
import { readResourceActor } from "../infrastructure/ChatbotResourceRepository";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import {
  createChatbotArtifactStorage,
  type ChatbotArtifactStorage,
} from "../infrastructure/ChatbotArtifactStorage";
import { prepareActiveResourceKnowledge } from "./ServerChatbotResourceService";
import {
  uploadChatbotRelease,
  verifyChatbotRelease,
} from "./ChatbotReleaseArtifacts";

export type ChatbotStorageFactory = (
  releaseId: string,
) => ChatbotArtifactStorage;

export async function synchronizeChatbotResources(
  adapter?: ChatbotStorageFactory,
) {
  const plan = await knowledgeTransaction(async (transaction) => {
    await lockResourceSynchronization(transaction);
    const snapshot = await prepareActiveResourceKnowledge(transaction);
    const hash = knowledgeFingerprint(snapshot);
    const lease = await readKnowledgeLease(transaction);
    const actorId = await readResourceActor(transaction);
    if (!actorId) return null;
    if (lease.releaseId) {
      const [release, storage] = await Promise.all([
        readKnowledgeRelease(lease.releaseId, transaction),
        readReleaseStorage(lease.releaseId, transaction),
      ]);
      if (
        release.contentHash === hash &&
        storage.verified &&
        !storage.revoked
      ) {
        const job = await nextKnowledgeSourceJob(transaction);
        if (job)
          await finishKnowledgeSourceJob(transaction, job.id, release.id);
        return {
          current: true as const,
          release,
          lease,
          actorId,
          processed: Boolean(job),
        };
      }
    }
    const existingId = await findAutomaticKnowledge(transaction, hash);
    let release = existingId
      ? await readKnowledgeRelease(existingId, transaction)
      : null;
    if (!release) {
      const prepared = await insertPreparedKnowledge(
        transaction,
        actorId,
        snapshot,
        hash,
        "SYNCHRONIZED_FROM_PUBLICATION",
      );
      release = await insertKnowledgeApproval(
        transaction,
        actorId,
        prepared,
        "SOURCE_PUBLICATION_ACCEPTED",
      );
    }
    return { current: false as const, release, lease, actorId };
  });
  if (!plan) return { processed: false, candidateId: null };
  if (plan.current)
    return { processed: plan.processed, candidateId: plan.release.id };
  const storage =
    adapter?.(plan.release.id) ?? createChatbotArtifactStorage(plan.release.id);
  const verified = await uploadChatbotRelease(plan.release, storage);
  await verifyChatbotRelease(plan.release, verified, storage);
  await knowledgeTransaction(async (transaction) => {
    const current = await prepareActiveResourceKnowledge(transaction);
    if (knowledgeFingerprint(current) !== plan.release.contentHash) {
      throw new ResourceConflictError(
        "Published resources changed during synchronization. Retry with the current resources.",
      );
    }
    const lease = await readKnowledgeLease(transaction, true);
    if (lease.releaseId !== plan.release.id) {
      if (lease.epoch !== plan.lease.epoch) {
        throw new ResourceConflictError(
          "Resource selection changed during synchronization. Retry with the current resources.",
        );
      }
      await activateKnowledgeRelease(
        transaction,
        plan.actorId,
        plan.release,
        verified,
      );
    }
    const job = await nextKnowledgeSourceJob(transaction);
    if (job)
      await finishKnowledgeSourceJob(transaction, job.id, plan.release.id);
  });
  return { processed: true, candidateId: plan.release.id };
}
