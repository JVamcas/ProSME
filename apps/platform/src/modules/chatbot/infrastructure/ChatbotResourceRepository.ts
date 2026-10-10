import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type { ChatbotResource } from "../domain/ChatbotResource";
import type { KnowledgeSelection } from "../domain/ChatbotKnowledge";
import type { ChatbotResourceQuery } from "../api/ChatbotResourceSchemas";

// Explicit public projections: no drafts, editor notes, private contacts or full snapshots.
const publishedResources = sql`
  SELECT 'funding:' || c.id::text AS key, p.snapshot->>'title' AS name,
    'funding' AS type, p.published_at AS last_updated,
    '/how-to-apply/funding/' || c.id::text AS url
  FROM app_funding_calls c
  JOIN app_funding_call_publication_revisions p ON p.id = c.current_published_version_id
  WHERE c.status IN ('SCHEDULED', 'LIVE', 'CLOSED')
  UNION ALL
  SELECT 'eligibility:' || c.id::text, p.snapshot->>'title' || ' — Eligibility rules (version ' || v.version_number::text || ')',
    'eligibility', greatest(p.published_at, v.published_at),
    '/how-to-apply/funding/' || c.id::text || '/eligibility'
  FROM app_funding_calls c
  JOIN app_funding_call_publication_revisions p ON p.id = c.current_published_version_id
  JOIN app_eligibility_rule_set_versions v ON v.id::text = p.snapshot->>'eligibilityRuleSetVersionId'
  WHERE c.status IN ('SCHEDULED', 'LIVE', 'CLOSED') AND v.status IN ('PUBLISHED', 'RETIRED')
  UNION ALL
  SELECT 'faq:' || id::text, question, 'faq', updated_at, '/cms/collections/faqs/' || id::text
  FROM cms_faqs WHERE _status = 'published' AND review_status = 'approved'
  UNION ALL
  SELECT 'contact:contact-details', 'Contact details', 'contact', max(updated_at), '/contact'
  FROM cms_contact_details WHERE _status = 'published' AND review_status = 'approved'
  HAVING count(*) > 0
`;

export async function listChatbotResources(
  input: ChatbotResourceQuery,
  transaction?: DatabaseTransaction,
) {
  const result = await (transaction ?? getDatabase()).execute(sql`
    WITH resources AS (${publishedResources}), page_rows AS (
    SELECT r.key, r.name, r.type, r.url, coalesce(s.active, false) AS active,
      r.last_updated AS "lastUpdated"
    FROM resources r LEFT JOIN app_chatbot_resources s ON s.resource_key = r.key
    ORDER BY r.key LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
    )
    SELECT coalesce(jsonb_agg(page_rows ORDER BY page_rows.key), '[]'::jsonb) AS items,
      (SELECT count(*)::int FROM resources) AS total FROM page_rows
  `);
  const row = result.rows[0] as { items: ChatbotResource[]; total: number };
  const items = row.items.map((row) => ({
    ...row,
    lastUpdated: row.lastUpdated
      ? new Date(row.lastUpdated as string).toISOString()
      : null,
  })) as ChatbotResource[];
  return { items, total: row.total, ...input };
}

export async function findPublishedResourceKeys(
  keys: string[],
  transaction: DatabaseTransaction,
) {
  const result = await transaction.execute(sql`
    WITH resources AS (${publishedResources})
    SELECT key FROM resources WHERE key = ANY(${sql.param(keys)}::text[]) ORDER BY key
  `);
  return result.rows.map((row) => row.key as string);
}

export async function readActiveResourceSelection(
  transaction: DatabaseTransaction,
) {
  const result = await transaction.execute(sql`
    WITH resources AS (${publishedResources})
    SELECT r.key FROM resources r
    JOIN app_chatbot_resources s ON s.resource_key = r.key AND s.active
    ORDER BY r.key LIMIT 1202
  `);
  const keys = result.rows.map((row) => row.key as string);
  const selection: KnowledgeSelection = {
    fundingCallIds: keys
      .filter((key) => key.startsWith("funding:"))
      .map((key) => key.slice(8)),
    faqIds: keys
      .filter((key) => key.startsWith("faq:"))
      .map((key) => key.slice(4)),
    eligibilityCallIds: keys
      .filter((key) => key.startsWith("eligibility:"))
      .map((key) => key.slice(12)),
    ...(keys.includes("contact:contact-details") ? { contact: true } : {}),
  };
  return selection;
}

export async function changeChatbotResources(
  transaction: DatabaseTransaction,
  actorId: string,
  keys: string[],
  active: boolean,
) {
  // Serialize policy writes so each audit records the state immediately before its change.
  await transaction.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext('chatbot-resource-policy'))`,
  );
  const before = await transaction.execute(sql`
    SELECT resource_key AS key, active FROM app_chatbot_resources
    WHERE resource_key = ANY(${sql.param(keys)}::text[]) ORDER BY resource_key FOR UPDATE
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_resource_audit(actor_id, resource_keys, before_state, active)
    VALUES (${actorId}::uuid, ${JSON.stringify(keys)}::jsonb, ${JSON.stringify(before.rows)}::jsonb, ${active})
  `);
  await transaction.execute(sql`
    INSERT INTO app_chatbot_resources(resource_key, active, updated_by)
    SELECT key, ${active}, ${actorId}::uuid FROM unnest(${sql.param(keys)}::text[]) AS selected(key)
    ORDER BY key
    ON CONFLICT (resource_key) DO UPDATE
    SET active = excluded.active, updated_by = excluded.updated_by, updated_at = now()
  `);
}

export async function readResourceActor(transaction: DatabaseTransaction) {
  const result = await transaction.execute(sql`
    SELECT updated_by AS id FROM app_chatbot_resources
    ORDER BY updated_at DESC, resource_key DESC LIMIT 1
  `);
  return (result.rows[0]?.id as string | undefined) ?? null;
}
