import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";

export async function lockResourceSynchronization(
  transaction: DatabaseTransaction,
) {
  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext('chatbot-resource-synchronization'))`,
  );
}

export async function findAutomaticKnowledge(
  transaction: DatabaseTransaction,
  hash: string,
) {
  const result = await transaction.execute(sql`
    SELECT r.id FROM app_chatbot_knowledge_releases r
    WHERE r.content_hash = ${hash} AND r.status = 'APPROVED'
      AND EXISTS (SELECT 1 FROM app_chatbot_knowledge_audit a WHERE a.release_id = r.id AND a.action = 'SOURCE_PUBLICATION_ACCEPTED')
      AND NOT EXISTS (SELECT 1 FROM app_chatbot_release_revocations v WHERE v.release_id = r.id)
    ORDER BY r.prepared_at DESC, r.id DESC LIMIT 1
  `);
  return (result.rows[0]?.id as string | undefined) ?? null;
}
