import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";

export type FaqKnowledgeProjection = {
  id: string;
  question: string | null;
  answer: unknown;
};

// CMS owns these tables. This fixed projection always reads published main rows,
// never the version/draft tables or the authorized staff preview path.
export async function readFaqKnowledgeSources(
  ids: string[],
  transaction: DatabaseTransaction,
) {
  const rows: FaqKnowledgeProjection[] = [];
  let after = 0;
  while (ids.length) {
    const result = await transaction.execute(sql`
      SELECT id::text AS id, question, answer FROM cms_faqs
      WHERE _status = 'published' AND review_status = 'approved'
        AND id = ANY(${sql.param(ids)}::integer[]) AND id > ${after}
      ORDER BY cms_faqs.id LIMIT 50 FOR SHARE
    `);
    const page = result.rows as FaqKnowledgeProjection[];
    rows.push(...page);
    if (page.length < 50) break;
    // Keyset pages depend on the preceding page; row locks last through approval.
    after = Number(page[page.length - 1].id);
  }
  return rows;
}

export async function listFaqKnowledgeSources(input: {
  after?: string;
  search: string;
  limit: number;
}) {
  const result = await getDatabase().execute(sql`
    SELECT id::text AS id, question AS label, 'Approved published FAQ' AS revision
    FROM cms_faqs WHERE _status = 'published' AND review_status = 'approved'
      AND id > ${Number(input.after ?? 0)} AND question ILIKE ${`%${input.search}%`}
    ORDER BY cms_faqs.id LIMIT ${input.limit + 1}
  `);
  return result.rows as { id: string; label: string; revision: string }[];
}
