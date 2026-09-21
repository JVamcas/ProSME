export const firstOwnerId = "31111111-1111-4111-8111-111111111111";
export const secondOwnerId = "32222222-2222-4222-8222-222222222222";
export const opportunityId = "00000000-0000-4000-8000-000000004242";
export const businessOpportunityId = "00000000-0000-4000-8000-000000004343";
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
      (id, form_definition_id, version_number, status, created_by, published_by,
       published_at)
     VALUES ($1, $2, 1, 'PUBLISHED', $3, $3, now())`,
    [formVersionId, definitionId, firstOwnerId],
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
      (id, rule_set_id, version_number, status, created_by, published_by,
       published_at)
     VALUES ($1, $2, 1, 'PUBLISHED', $3, $3, now())`,
    [eligibilityRuleSetVersionId, ruleSetId, firstOwnerId],
  );
}
