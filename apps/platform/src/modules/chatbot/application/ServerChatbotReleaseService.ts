import "server-only";
import { z } from "zod";
import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { ResourceConflictError } from "@/lib/resource-errors";
import type { KnowledgeRelease } from "../domain/ChatbotKnowledge";
import {
  knowledgeTransaction,
  readKnowledgeRelease,
} from "../infrastructure/ChatbotKnowledgeRepository";
import {
  activateKnowledgeRelease,
  readKnowledgeLease,
  readReleaseStorage,
  revokeKnowledgeRelease,
} from "../infrastructure/ChatbotReleaseRepository";
import { knowledgeFingerprint } from "../infrastructure/KnowledgeFingerprint";
import {
  createChatbotArtifactStorage,
  type ChatbotArtifactStorage,
} from "../infrastructure/ChatbotArtifactStorage";
import { prepareKnowledgeSources } from "./ServerChatbotKnowledgeService";
import {
  uploadChatbotRelease,
  verifyChatbotRelease,
} from "./ChatbotReleaseArtifacts";
import type { DatabaseTransaction } from "@/platform/database/client";

export async function assertCurrentKnowledge(
  release: KnowledgeRelease,
  transaction: DatabaseTransaction,
) {
  if (
    release.status !== "APPROVED" ||
    release.snapshot.issues.length ||
    knowledgeFingerprint(release.snapshot) !== release.contentHash
  )
    throw new ResourceConflictError("Exact approved knowledge is required.");
  const current = await prepareKnowledgeSources(
    release.snapshot.selection,
    transaction,
  );
  if (knowledgeFingerprint(current) !== release.contentHash)
    throw new ResourceConflictError(
      "Public sources changed. Prepare and approve replacement knowledge.",
    );
  const storage = await readReleaseStorage(release.id, transaction);
  if (storage.revoked)
    throw new ResourceConflictError("This knowledge release was withdrawn.");
}

const publishSchema = z
  .object({
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
    expectedEpoch: z.string().regex(/^\d+$/),
  })
  .strict();

export async function publishChatbotKnowledgeRelease(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
  adapter?: ChatbotArtifactStorage,
) {
  const actor = requirePermission(
    requirePermission(user, permissionCodes.chatbotKnowledgeReadAll),
    permissionCodes.chatbotKnowledgePublishAll,
  );
  const input = publishSchema.parse(values);
  const release = await readKnowledgeRelease(z.uuid().parse(id));
  if (
    input.contentHash !== release.contentHash ||
    release.status !== "APPROVED"
  )
    throw new ResourceConflictError(
      "Approve this exact preview before publication.",
    );
  const storage = adapter ?? createChatbotArtifactStorage(release.id);
  const artifacts = await uploadChatbotRelease(release, storage);
  await verifyChatbotRelease(release, artifacts, storage);
  return knowledgeTransaction(async (transaction) => {
    await readKnowledgeRelease(release.id, transaction, true);
    await assertCurrentKnowledge(release, transaction);
    // Source locks precede the state lock, matching source writers and their outbox trigger.
    const lease = await readKnowledgeLease(transaction, true);
    if (lease.releaseId === release.id) return lease;
    if (lease.epoch !== input.expectedEpoch)
      throw new ResourceConflictError(
        "Active knowledge changed during publication. Review it before retrying.",
      );
    return activateKnowledgeRelease(transaction, actor.id, release, artifacts);
  });
}

export async function withdrawChatbotKnowledgeRelease(
  user: AuthenticatedUser | null,
  id: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.chatbotKnowledgeWithdrawAll,
  );
  return knowledgeTransaction(async (transaction) => {
    const release = await readKnowledgeRelease(
      z.uuid().parse(id),
      transaction,
      true,
    );
    const existing = await readReleaseStorage(release.id, transaction);
    if (!existing.revoked)
      await revokeKnowledgeRelease(transaction, actor.id, release);
    return readKnowledgeLease(transaction);
  });
}
