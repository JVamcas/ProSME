export const firstOwnerId = "31111111-1111-4111-8111-111111111111";
export const secondOwnerId = "32222222-2222-4222-8222-222222222222";
export const opportunityId = "00000000-0000-4000-8000-000000004242";
export const businessOpportunityId = "00000000-0000-4000-8000-000000004343";
export const draftOpportunityId = "00000000-0000-4000-8000-000000004444";
export const formVersionId = "20000000-0000-4000-8000-000000000002";
export const eligibilityRuleSetVersionId =
  "30000000-0000-4000-8000-000000000002";
export const firstBusinessId = "33333333-3333-4333-8333-333333333331";
export const secondBusinessId = "33333333-3333-4333-8333-333333333332";

type Query = (text: string, values?: unknown[]) => Promise<unknown>;

export async function seedApplicationDatabaseFixture(query: Query) {
  await query(
    `INSERT INTO app_users
      (id, email, display_name, user_type, status)
     VALUES
      ($1, 'application-owner@example.test', 'Application Owner', 'applicant', 'active'),
      ($2, 'isolated-owner@example.test', 'Isolated Owner', 'applicant', 'active')`,
    [firstOwnerId, secondOwnerId],
  );
  await query(
    `INSERT INTO app_business_profiles
      (id, user_id, legal_name, business_type, sector, region, physical_address)
     VALUES
      ($1, $3, 'First Business', 'cc', 'services', 'Khomas', 'Test'),
      ($2, $3, 'Second Business', 'cc', 'services', 'Khomas', 'Test')`,
    [firstBusinessId, secondBusinessId, firstOwnerId],
  );
  await seedFormVersion(query);
  await seedEligibilityVersion(query);
  await seedFundingCalls(query);
}

async function seedFundingCalls(query: Query) {
  const calls = [
    [opportunityId, "DATABASE-INTEGRATION", "database-integration", "Database Integration Fund"],
    [businessOpportunityId, "BUSINESS-SCOPED", "business-scoped", "Business-scoped Fund"],
    [draftOpportunityId, "DRAFT-AUTOSAVE", "draft-autosave", "Draft Autosave Fund"],
  ];
  for (const [id, reference, slug, title] of calls) {
    await query(
      `INSERT INTO app_funding_calls
        (id, reference, slug, title, description, form_version_id,
         eligibility_rule_set_version_id, application_duplicate_policy,
         total_budget_envelope, minimum_grant_amount, maximum_grant_amount,
         opens_at, closes_at, status, created_by, updated_by)
       VALUES
        ($1, $2, $3, $4, '', $5, $6, 'one_per_business',
         1000000, 1000, 100000, now() - interval '1 day',
         now() + interval '30 days', 'LIVE', $7, $7)`,
      [
        id,
        reference,
        slug,
        title,
        formVersionId,
        eligibilityRuleSetVersionId,
        firstOwnerId,
      ],
    );
    const lifecycleId = crypto.randomUUID();
    await query(
      `INSERT INTO app_funding_call_lifecycle_history
        (id, funding_call_id, command, source_status, target_status,
         actor_id, command_time, effective_time, row_version, correlation_id,
         idempotency_key)
       VALUES
        ($1, $2, 'PUBLISH', 'DRAFT', 'LIVE', $3, now(), now(), 2, $4, $5)`,
      [
        lifecycleId,
        id,
        firstOwnerId,
        crypto.randomUUID(),
        crypto.randomUUID(),
      ],
    );
    await query(
      `INSERT INTO app_funding_call_publication_revisions
        (funding_call_id, revision_number, source_row_version,
         published_status, snapshot, lifecycle_history_id, published_by,
         published_at, correlation_id)
       VALUES ($1, 1, 1, 'LIVE', $2::jsonb, $3, $4, now(), $5)`,
      [
        id,
        JSON.stringify({
          applicationDuplicatePolicy: "one_per_business",
          closesAt: "2027-12-31T00:00:00.000Z",
          description: "",
          eligibilityRuleSetVersionId,
          eligibilitySummary: null,
          formVersionId,
          fundingInstrument: null,
          maximumGrantAmount: "100000.00",
          minimumGrantAmount: "1000.00",
          opensAt: "2026-01-01T00:00:00.000Z",
          publicContactEmail: null,
          publicContactName: null,
          publicContactPhone: null,
          publicDocuments: [],
          reference,
          slug,
          thematicArea: null,
          title,
          totalBudgetEnvelope: "1000000.00",
          workflowTemplateVersionId: null,
        }),
        lifecycleId,
        firstOwnerId,
        crypto.randomUUID(),
      ],
    );
  }
}

async function seedFormVersion(query: Query) {
  const definitionId = "20000000-0000-4000-8000-000000000001";
  await query(
    `INSERT INTO app_form_definitions
      (id, code, name, description, created_by)
     VALUES ($1, 'APPLICATION_DATABASE_TEST', 'Application database test', '', $2)`,
    [definitionId, firstOwnerId],
  );
  await query(
    `INSERT INTO app_form_versions
      (id, form_definition_id, version_number, status, created_by)
     VALUES ($1, $2, 1, 'DRAFT', $3)`,
    [formVersionId, definitionId, firstOwnerId],
  );
  await query(
    `UPDATE app_form_versions
     SET status = 'PUBLISHED', row_version = 2, published_by = $2,
       published_at = now(), updated_at = now()
     WHERE id = $1`,
    [formVersionId, firstOwnerId],
  );
}

async function seedEligibilityVersion(query: Query) {
  const ruleSetId = "30000000-0000-4000-8000-000000000001";
  await query(
    `INSERT INTO app_eligibility_rule_sets
      (id, code, name, description, created_by)
     VALUES ($1, 'APPLICATION_DATABASE_TEST',
       'Application database test', '', $2)`,
    [ruleSetId, firstOwnerId],
  );
  await query(
    `INSERT INTO app_eligibility_rule_set_versions
      (id, rule_set_id, version_number, status, created_by)
     VALUES ($1, $2, 1, 'DRAFT', $3)`,
    [eligibilityRuleSetVersionId, ruleSetId, firstOwnerId],
  );
  await query(
    `UPDATE app_eligibility_rule_set_versions
     SET status = 'PUBLISHED', row_version = 2, published_by = $2,
       published_at = now(), updated_at = now()
     WHERE id = $1`,
    [eligibilityRuleSetVersionId, firstOwnerId],
  );
}
