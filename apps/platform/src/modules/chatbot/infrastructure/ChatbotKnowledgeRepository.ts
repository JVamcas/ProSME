import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type {
  KnowledgeRelease,
  KnowledgeWorkspace,
  PreparedKnowledge,
} from "../domain/ChatbotKnowledge";

export function knowledgeTransaction<T>(
  operation: (transaction: DatabaseTransaction) => Promise<T>,
) {
  return getDatabase().transaction(operation, {
    isolationLevel: "read committed",
  });
}

type ReleaseRow = Omit<KnowledgeRelease, "preparedAt" | "approvedAt"> & {
  preparedAt: Date | string;
  approvedAt: Date | string | null;
};
function releaseDto(row: ReleaseRow): KnowledgeRelease {
  return {
    ...row,
    preparedAt: new Date(row.preparedAt).toISOString(),
    approvedAt: row.approvedAt ? new Date(row.approvedAt).toISOString() : null,
  };
}

export async function readKnowledgeRelease(
  id: string,
  transaction?: DatabaseTransaction,
  lock = false,
) {
  const result = await (transaction ?? getDatabase()).execute(sql`
    SELECT id, status, content_hash AS "contentHash", snapshot,
      prepared_at AS "preparedAt", approved_at AS "approvedAt"
    FROM app_chatbot_knowledge_releases WHERE id = ${id}::uuid
    ${lock ? sql`FOR UPDATE` : sql``}
  `);
  const row = result.rows[0] as ReleaseRow | undefined;
  if (!row) throw new ResourceNotFoundError("knowledge release");
  return releaseDto(row);
}

export async function readKnowledgeWorkspace(): Promise<KnowledgeWorkspace> {
  const [list, state] = await Promise.all([
    getDatabase().execute(sql`
      SELECT id, status, content_hash AS "contentHash", prepared_at AS "preparedAt", approved_at AS "approvedAt",
        EXISTS(SELECT 1 FROM app_chatbot_release_revocations WHERE release_id = r.id) AS withdrawn
      FROM app_chatbot_knowledge_releases r ORDER BY prepared_at DESC, id DESC LIMIT 20
    `),
    getDatabase().execute(
      sql`SELECT active_release_id AS "activeReleaseId", epoch::text FROM app_chatbot_knowledge_state WHERE key = 'ACTIVE'`,
    ),
  ]);
  return {
    releases: (list.rows as ReleaseRow[]).map(releaseDto),
    activeReleaseId: (state.rows[0]?.activeReleaseId as string | null) ?? null,
    epoch: (state.rows[0]?.epoch as string) ?? "0",
  };
}

export async function readActiveKnowledgeRecords() {
  const result = await getDatabase().execute(sql`
    SELECT r.snapshot->'records' AS records FROM app_chatbot_knowledge_state s
    INNER JOIN app_chatbot_knowledge_releases r ON r.id = s.active_release_id
    WHERE s.key = 'ACTIVE' AND r.status = 'APPROVED'
  `);
  return (result.rows[0]?.records ?? []) as PreparedKnowledge["records"];
}

async function audit(
  transaction: DatabaseTransaction,
  actorId: string,
  releaseId: string,
  contentHash: string,
  action: string,
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_knowledge_audit(actor_id, release_id, content_hash, action)
    VALUES (${actorId}::uuid, ${releaseId}::uuid, ${contentHash}, ${action})
  `);
}

export async function insertPreparedKnowledge(
  transaction: DatabaseTransaction,
  actorId: string,
  snapshot: PreparedKnowledge,
  contentHash: string,
  action = "PREPARED",
) {
  const result = await transaction.execute(sql`
    INSERT INTO app_chatbot_knowledge_releases(prepared_by, snapshot, content_hash)
    VALUES (${actorId}::uuid, ${JSON.stringify(snapshot)}::jsonb, ${contentHash}) RETURNING id
  `);
  const id = result.rows[0].id as string;
  await audit(transaction, actorId, id, contentHash, action);
  return readKnowledgeRelease(id, transaction);
}

export async function insertKnowledgeApproval(
  transaction: DatabaseTransaction,
  actorId: string,
  release: KnowledgeRelease,
  action = "APPROVED",
) {
  await transaction.execute(sql`
    INSERT INTO app_chatbot_knowledge_approvals(release_id, content_hash, approved_by)
    VALUES (${release.id}::uuid, ${release.contentHash}, ${actorId}::uuid)
  `);
  await transaction.execute(sql`
    UPDATE app_chatbot_knowledge_releases SET status = 'APPROVED', approved_at = now()
    WHERE id = ${release.id}::uuid AND status = 'PREPARED'
  `);
  await audit(transaction, actorId, release.id, release.contentHash, action);
  return readKnowledgeRelease(release.id, transaction);
}
