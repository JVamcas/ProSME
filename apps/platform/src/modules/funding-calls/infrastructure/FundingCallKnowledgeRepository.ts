import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";

export type FundingCallKnowledgeProjection = {
  id: string;
  revisionId: string;
  revisionNumber: number;
  status: string;
  publicFields: {
    title: string;
    reference: string;
    slug: string;
    description: string;
    eligibilitySummary: string | null;
    opensAt: string;
    closesAt: string;
    minimumGrantAmount: string;
    maximumGrantAmount: string;
    totalBudgetEnvelope: string;
    fundingInstrument: string | null;
    thematicArea: string | null;
    publicContactName: string | null;
    publicContactEmail: string | null;
    publicContactPhone: string | null;
    publicDocuments: { label: string; url: string }[];
  };
  eligibilityVersionId: string | null;
};

// A JSON projection prevents private form/workflow/storage bindings entering the export.
export async function readFundingCallKnowledgeSources(
  ids: string[],
  transaction: DatabaseTransaction,
) {
  if (!ids.length) return [];
  const result = await transaction.execute(sql`
    SELECT c.id, p.id AS "revisionId", p.revision_number AS "revisionNumber",
      c.status,
      p.snapshot->>'eligibilityRuleSetVersionId' AS "eligibilityVersionId",
      jsonb_build_object(
        'title', p.snapshot->'title', 'reference', p.snapshot->'reference',
        'slug', p.snapshot->'slug', 'description', p.snapshot->'description',
        'eligibilitySummary', p.snapshot->'eligibilitySummary',
        'opensAt', p.snapshot->'opensAt', 'closesAt', p.snapshot->'closesAt',
        'minimumGrantAmount', p.snapshot->'minimumGrantAmount',
        'maximumGrantAmount', p.snapshot->'maximumGrantAmount',
        'totalBudgetEnvelope', p.snapshot->'totalBudgetEnvelope',
        'fundingInstrument', p.snapshot->'fundingInstrument',
        'thematicArea', p.snapshot->'thematicArea',
        'publicContactName', p.snapshot->'publicContactName',
        'publicContactEmail', p.snapshot->'publicContactEmail',
        'publicContactPhone', p.snapshot->'publicContactPhone',
        'publicDocuments', p.snapshot->'publicDocuments'
      ) AS "publicFields"
    FROM app_funding_calls c
    INNER JOIN app_funding_call_publication_revisions p ON p.id = c.current_published_version_id
    WHERE c.id = ANY(${sql.param(ids)}::uuid[]) AND c.status IN ('SCHEDULED', 'LIVE', 'CLOSED')
    ORDER BY c.id FOR SHARE OF c, p
  `);
  return result.rows as FundingCallKnowledgeProjection[];
}

export async function listFundingCallKnowledgeSources(input: {
  after?: string;
  search: string;
  limit: number;
}) {
  const result = await getDatabase().execute(sql`
    SELECT c.id, p.snapshot->>'title' AS label,
      'Publication ' || p.revision_number::text AS revision
    FROM app_funding_calls c
    INNER JOIN app_funding_call_publication_revisions p ON p.id = c.current_published_version_id
    WHERE c.status IN ('SCHEDULED', 'LIVE', 'CLOSED')
      AND (${input.after ?? null}::uuid IS NULL OR c.id > ${input.after ?? null}::uuid)
      AND (p.snapshot->>'title' ILIKE ${`%${input.search}%`}
        OR p.snapshot->>'reference' ILIKE ${`%${input.search}%`})
    ORDER BY c.id LIMIT ${input.limit + 1}
  `);
  return result.rows as { id: string; label: string; revision: string }[];
}
