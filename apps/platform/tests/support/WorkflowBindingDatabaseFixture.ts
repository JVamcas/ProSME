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

export async function insertCompleteSubmissionApplications(
  query: DatabaseQuery,
  input: {
    applicationIds: string[];
    businessId: string;
    eligibilityVersionId: string;
    ownerId: string;
  },
) {
  for (let index = 0; index < input.applicationIds.length; index += 1) {
    const applicationId = input.applicationIds[index];
    await query(
      `INSERT INTO app_applications
        (id, owner_user_id, business_id, funding_opportunity_id,
         funding_opportunity_title, business_section, declarations_section,
         declaration_acceptance, section_completion,
         eligibility_rule_set_version_id)
       VALUES ($1, $2, $4, $3, 'Submission test application',
         jsonb_build_object('businessId', $4::text),
         '{"compliance":true}'::jsonb,
         '{"acceptedAt":"2026-09-15T08:00:00.000Z","declarationVersion":"v1","privacyVersion":"v1"}'::jsonb,
         '{"business":true,"project":true,"financial":true,"documents":true,"declarations":true}'::jsonb,
         $5)`,
      [
        applicationId,
        input.ownerId,
        submissionFundingCallIds[index],
        input.businessId,
        input.eligibilityVersionId,
      ],
    );
    for (const documentType of requiredSubmissionDocumentTypes) {
      await query(
        `INSERT INTO app_application_documents
          (application_id, owner_user_id, document_type, object_key,
           original_name, content_type, size_bytes, scan_status)
         VALUES ($1::uuid, $2::uuid, $3::text,
           $1::text || '/' || $3::text, $3::text || '.pdf',
           'application/pdf', 512, 'clean')`,
        [applicationId, input.ownerId, documentType],
      );
    }
  }
}

export function insertSubmissionFundingCalls(
  query: DatabaseQuery,
  workflowVersionId: string,
  eligibilityVersionId: string,
  actorId: string,
) {
  return query(
    `INSERT INTO app_funding_calls
       (id, reference, slug, title, description, total_budget_envelope,
        minimum_grant_amount, maximum_grant_amount, opens_at, closes_at,
        status, workflow_template_version_id, eligibility_rule_set_version_id,
        created_by, updated_by)
     VALUES
       ($1, 'SUBMISSION-FUND', 'submission-fund', 'Submission Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', $4, $5, $6, $6),
       ($2, 'MISSING-FUND', 'missing-fund', 'Missing workflow fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', NULL, $5, $6, $6),
       ($3, 'ROLLBACK-FUND', 'rollback-fund', 'Rollback Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', $4, $5, $6, $6)`,
    [
      ...submissionFundingCallIds,
      workflowVersionId,
      eligibilityVersionId,
      actorId,
    ],
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
