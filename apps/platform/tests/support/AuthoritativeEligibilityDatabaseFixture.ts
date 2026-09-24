import { expect } from "vitest";

type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export const eligibilityVersionId =
  "65777777-7777-4777-8777-777777777777";
const eligibilityRuleSetId = "65666666-6666-4666-8666-666666666666";

export async function installAuthoritativeEligibilityConfiguration(
  query: DatabaseQuery,
  actorId: string,
) {
  await query(
    `INSERT INTO app_eligibility_rule_sets
       (id, code, name, description, created_by)
     VALUES ($1, 'SUBMISSION_ELIGIBILITY', 'Submission eligibility', 'Test', $2)`,
    [eligibilityRuleSetId, actorId],
  );
  await query(
    `INSERT INTO app_eligibility_rule_set_versions
       (id, rule_set_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [eligibilityVersionId, eligibilityRuleSetId, actorId],
  );
  await query(
    `UPDATE app_eligibility_rule_set_versions
     SET status = 'PUBLISHED', row_version = 2, published_by = $2,
       published_at = now()
     WHERE id = $1`,
    [eligibilityVersionId, actorId],
  );
}

export async function expectPersistedAuthoritativeEligibility(
  query: DatabaseQuery,
  applicationId: string,
) {
  const result = await query(
    `SELECT eligibility_rule_set_version_id, rule_set_version_number,
      evaluated_at IS NOT NULL AS evaluated,
      final_screening_outcome, rule_outcomes, evaluated_values
     FROM app_authoritative_eligibility_outcomes
     WHERE application_id = $1`,
    [applicationId],
  );
  expect(result.rows[0]).toMatchObject({
    eligibility_rule_set_version_id: eligibilityVersionId,
    evaluated: true,
    evaluated_values: {},
    final_screening_outcome: "ELIGIBLE",
    rule_outcomes: [],
    rule_set_version_number: 1,
  });
  await expect(query(
    `UPDATE app_authoritative_eligibility_outcomes
     SET final_screening_outcome = 'INELIGIBLE'
     WHERE application_id = $1`,
    [applicationId],
  )).rejects.toThrow("authoritative eligibility outcomes are immutable");
}
