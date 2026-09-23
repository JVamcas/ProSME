type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export const submissionFundingCallIds = [
  "69999999-9999-4999-8999-999999999991",
  "69999999-9999-4999-8999-999999999992",
  "69999999-9999-4999-8999-999999999993",
];

const submissionFormDefinitionId = "6a111111-1111-4111-8111-111111111111";
const submissionFormVersionId = "6a222222-2222-4222-8222-222222222222";
const submissionFormSectionId = "6a333333-3333-4333-8333-333333333333";
const submissionFormTextFieldId = "6a444444-4444-4444-8444-444444444444";
const submissionFormDocumentFieldId = "6a555555-5555-4555-8555-555555555555";

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
         eligibility_rule_set_version_id, form_version_id)
       VALUES ($1, $2, $4, $3, 'Submission test application',
         jsonb_build_object('businessId', $4::text),
         '{"compliance":true,"falseInformation":true,"informationAccuracy":true,"privacyConsent":true,"terms":true}'::jsonb,
         '{"acceptedAt":"2026-09-15T08:00:00.000Z","declarationVersion":"sme-fund-applicant-declaration-v1","privacyVersion":"sme-fund-privacy-consent-v1"}'::jsonb,
         '{"business":true,"project":true,"financial":true,"documents":true,"declarations":true}'::jsonb,
         $5, $6)`,
      [
        applicationId,
        input.ownerId,
        submissionFundingCallIds[index],
        input.businessId,
        input.eligibilityVersionId,
        submissionFormVersionId,
      ],
    );
    const response = await query(
      `INSERT INTO app_application_draft_responses
        (application_id, form_version_id, respondent_user_id, values)
       VALUES ($1, $2, $3, '{"BUSINESS_NAME":"Submission Business"}'::jsonb)
       RETURNING id`,
      [applicationId, submissionFormVersionId, input.ownerId],
    );
    await query(
      `UPDATE app_applications SET latest_draft_response_id = $2 WHERE id = $1`,
      [applicationId, response.rows[0].id],
    );
    await query(
      `INSERT INTO app_application_document_versions
        (application_id, owner_user_id, requirement_key, version_number,
         object_key, original_name, content_type, extension, size_bytes,
         checksum_sha256, storage_status, scan_status, finalized_at, scanned_at)
       VALUES ($1, $2, 'REGISTRATION_DOCUMENT', 1,
         $1::text || '/registration-document', 'registration.pdf',
         'application/pdf', '.pdf', 512, $3, 'finalized', 'clean', now(), now())`,
      [applicationId, input.ownerId, "a".repeat(64)],
    );
  }
}

export async function insertSubmissionFundingCalls(
  query: DatabaseQuery,
  workflowVersionId: string,
  eligibilityVersionId: string,
  actorId: string,
) {
  await query(
    `INSERT INTO app_form_definitions
      (id, code, name, description, created_by)
     VALUES ($1, 'SUBMISSION_TEST_FORM', 'Submission test form', '', $2)`,
    [submissionFormDefinitionId, actorId],
  );
  await query(
    `INSERT INTO app_form_versions
      (id, form_definition_id, version_number, status, created_by,
       published_by, published_at)
     VALUES ($1, $2, 1, 'PUBLISHED', $3, $3, now())`,
    [submissionFormVersionId, submissionFormDefinitionId, actorId],
  );
  await query(
    `INSERT INTO app_form_sections
      (id, form_version_id, key, title, display_order)
     VALUES ($1, $2, 'APPLICATION', 'Application', 1)`,
    [submissionFormSectionId, submissionFormVersionId],
  );
  await query(
    `INSERT INTO app_form_fields
      (id, form_version_id, section_id, key, label, type, required, display_order)
     VALUES
      ($1, $3, $4, 'BUSINESS_NAME', 'Business name', 'TEXT', true, 1),
      ($2, $3, $4, 'REGISTRATION_DOCUMENT', 'Registration document',
       'DOCUMENT', true, 2)`,
    [
      submissionFormTextFieldId,
      submissionFormDocumentFieldId,
      submissionFormVersionId,
      submissionFormSectionId,
    ],
  );
  return query(
    `INSERT INTO app_funding_calls
       (id, reference, slug, title, description, total_budget_envelope,
        minimum_grant_amount, maximum_grant_amount, opens_at, closes_at,
        status, workflow_template_version_id, eligibility_rule_set_version_id,
        form_version_id,
        created_by, updated_by)
     VALUES
       ($1, 'SUBMISSION-FUND', 'submission-fund', 'Submission Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', $4, $5, $7, $6, $6),
       ($2, 'MISSING-FUND', 'missing-fund', 'Missing workflow fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', NULL, $5, $7, $6, $6),
       ($3, 'ROLLBACK-FUND', 'rollback-fund', 'Rollback Fund', 'Test',
        1000000, 10000, 100000, now() - interval '1 day',
        now() + interval '1 day', 'LIVE', $4, $5, $7, $6, $6)`,
    [
      ...submissionFundingCallIds,
      workflowVersionId,
      eligibilityVersionId,
      actorId,
      submissionFormVersionId,
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
