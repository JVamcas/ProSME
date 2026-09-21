type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export const submissionFundingCallIds = [
  "69999999-9999-4999-8999-999999999991",
  "69999999-9999-4999-8999-999999999992",
  "69999999-9999-4999-8999-999999999993",
];

export const requiredSubmissionDocumentTypes = [
  "business-registration",
  "financial-statements",
  "project-proposal",
] as const;

export function insertSubmissionFundingCalls(
  query: DatabaseQuery,
  workflowVersionId: string,
  actorId: string,
) {
  return query(
    `INSERT INTO app_funding_calls
       (id, reference, slug, title, description, total_budget_envelope,
        minimum_grant_amount, maximum_grant_amount, opens_at, closes_at,
        status, workflow_template_version_id, created_by, updated_by)
     VALUES
       ($1, 'SUBMISSION-FUND', 'submission-fund', 'Submission Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'OPEN', $4, $5, $5),
       ($2, 'MISSING-FUND', 'missing-fund', 'Missing workflow fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'OPEN', NULL, $5, $5),
       ($3, 'ROLLBACK-FUND', 'rollback-fund', 'Rollback Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'OPEN', $4, $5, $5)`,
    [...submissionFundingCallIds, workflowVersionId, actorId],
  );
}

export async function publishNewerWorkflowVersion(
  query: DatabaseQuery,
  actorId: string,
  definitionId: string,
) {
  await query(
    `INSERT INTO app_workflow_definition_versions
       (id, definition_id, version_number, status, created_by,
        published_by, published_at)
     VALUES ($1, $2, 2, 'PUBLISHED', $3, $3, now())`,
    ["62222222-2222-4222-8222-222222222223", definitionId, actorId],
  );
}
