import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type { VerifiedChatbotArtifacts } from "../domain/ChatbotReleaseArtifacts";
import type { KnowledgeRelease } from "../domain/ChatbotKnowledge";

export type KnowledgeLease = { releaseId: string | null; epoch: string };

export async function readKnowledgeLease(
  transaction?: DatabaseTransaction,
  lock = false,
): Promise<KnowledgeLease> {
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT active_release_id AS "releaseId", epoch::text FROM app_chatbot_knowledge_state
    WHERE key = 'ACTIVE' ${lock ? sql`FOR UPDATE` : sql``}
  `);
  return result.rows[0] as KnowledgeLease;
}

export async function readReleaseStorage(
  id: string,
  transaction?: DatabaseTransaction,
) {
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT r.prepared_by AS "preparedBy", a.verified,
      EXISTS (SELECT 1 FROM app_chatbot_release_revocations WHERE release_id = r.id) AS revoked
    FROM app_chatbot_knowledge_releases r
    LEFT JOIN app_chatbot_release_artifacts a ON a.release_id = r.id WHERE r.id = ${id}::uuid
  `);
  return result.rows[0] as {
    preparedBy: string;
    verified: VerifiedChatbotArtifacts | null;
    revoked: boolean;
  };
}

export async function activateKnowledgeRelease(
  transaction: DatabaseTransaction,
  actorId: string,
  release: KnowledgeRelease,
  verified: VerifiedChatbotArtifacts,
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_release_artifacts(release_id, verified)
    VALUES (${release.id}::uuid, ${JSON.stringify(verified)}::jsonb) ON CONFLICT DO NOTHING
  `);
  await transaction.execute(sql`
    UPDATE app_chatbot_knowledge_state SET active_release_id = ${release.id}::uuid, epoch = epoch + 1 WHERE key = 'ACTIVE'
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_knowledge_audit(actor_id, release_id, content_hash, action)
    VALUES (${actorId}::uuid, ${release.id}::uuid, ${release.contentHash}, 'ACTIVATED')
  `);
  return readKnowledgeLease(transaction);
}

export async function revokeKnowledgeRelease(
  transaction: DatabaseTransaction,
  actorId: string,
  release: KnowledgeRelease,
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_release_revocations(release_id, actor_id) VALUES (${release.id}::uuid, ${actorId}::uuid) ON CONFLICT DO NOTHING
  `);
  await transaction.execute(sql`
    UPDATE app_chatbot_knowledge_state SET active_release_id = NULL, epoch = epoch + 1
    WHERE key = 'ACTIVE' AND active_release_id = ${release.id}::uuid
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_knowledge_audit(actor_id, release_id, content_hash, action)
    VALUES (${actorId}::uuid, ${release.id}::uuid, ${release.contentHash}, 'WITHDRAWN')
  `);
}

export async function nextKnowledgeSourceJob(transaction: DatabaseTransaction) {
  const result = await transaction.execute(sql`
    SELECT id, release_id AS "releaseId" FROM app_chatbot_source_jobs WHERE processed_at IS NULL
    ORDER BY epoch LIMIT 1 FOR UPDATE SKIP LOCKED
  `);
  return result.rows[0] as { id: string; releaseId: string } | undefined;
}

export async function finishKnowledgeSourceJob(
  transaction: DatabaseTransaction,
  id: string,
  candidateId: string | null,
) {
  await transaction.execute(sql`
    UPDATE app_chatbot_source_jobs SET candidate_id = ${candidateId}::uuid, processed_at = now() WHERE id = ${id}::uuid
  `);
}

export async function findPreparedReplacement(
  transaction: DatabaseTransaction,
  hash: string,
) {
  const result = await transaction.execute(sql`
    SELECT id FROM app_chatbot_knowledge_releases WHERE content_hash = ${hash} AND status = 'PREPARED' ORDER BY prepared_at DESC LIMIT 1
  `);
  return result.rows[0]?.id as string | undefined;
}
