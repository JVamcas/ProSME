import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type pg from "pg";

export const versionActorId = randomUUID();
export const versionApproverId = randomUUID();
export const versionOwnerId = randomUUID();

export async function prepareVersionDatabase(
  pool: pg.Pool,
  beforeMigration?: (pool: pg.Pool) => Promise<void>,
) {
  const tables = [
    "app_users",
    "app_applicant_profiles",
    "app_business_profiles",
    "app_authorization_audit_entries",
    "app_transactional_outbox",
    "app_funding_calls",
    "app_funding_call_lifecycle_history",
    "app_funding_call_publication_revisions",
    "app_funding_call_public_documents",
    "app_funding_call_governance_policy",
    "app_funding_call_governance_reviews",
    "app_funding_call_creation_progress",
    "app_applications",
    "app_application_commands",
    "app_application_submission_commands",
    "app_application_audit_entries",
    "app_application_draft_responses",
    "app_application_submission_snapshots",
    "app_application_document_versions",
    "app_form_definitions",
    "app_form_versions",
    "app_form_sections",
    "app_form_fields",
    "app_form_field_options",
    "app_eligibility_rule_sets",
    "app_eligibility_rule_set_versions",
    "app_eligibility_rules",
    "app_eligibility_integration_definitions",
    "app_eligibility_integration_versions",
    "app_funding_call_eligibility_integration_bindings",
    "app_eligibility_integration_executions",
    "app_condition_groups",
    "app_eligibility_rule_set_question_bindings",
    "app_eligibility_questions",
    "app_eligibility_input_definitions",
    "app_eligibility_self_check_questions",
    "app_eligibility_screening_source_bindings",
    "app_workflow_definitions",
    "app_workflow_definition_versions",
    "app_workflow_stage_definitions",
    "app_workflow_audit_entries",
    "app_workflow_instances",
    "app_workflow_stage_instances",
    "app_workflow_tasks",
    "app_workflow_events",
    "app_workflow_stage_document_requirements",
    "app_stage_task_action_bindings",
    "app_workflow_action_definitions",
    "app_workflow_document_evidence_versions",
    "app_workflow_task_document_evidence",
    "app_workflow_holds",
    "app_authoritative_eligibility_outcomes",
    "app_workflow_stage_join_predecessors",
    "app_form_responses",
    "app_stage_task_definitions",
    "app_stage_task_form_bindings",
    "app_application_lifecycle_history",
    "app_eligibility_rule_set_verification_forms",
  ];
  for (const table of tables) {
    await pool.query(`CREATE TABLE ${table} (
      LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES INCLUDING IDENTITY
    )`);
  }
  await pool.query("CREATE SEQUENCE app_application_reference_seq");
  // The fixture's initial stage has no reviewer tasks; this function is needed
  // to parse the prior-stage query and is never invoked for an empty task set.
  await pool.query(`CREATE FUNCTION app_workflow_task_coi_cleared(uuid, uuid)
    RETURNS boolean LANGUAGE sql AS 'SELECT false'`);
  await pool.query(`
    ALTER TABLE app_funding_calls DROP COLUMN IF EXISTS current_published_version_id;
    ALTER TABLE app_applications DROP COLUMN IF EXISTS funding_call_version_id;
    ALTER TABLE app_funding_call_governance_reviews DROP COLUMN IF EXISTS funding_call_version_id;
  `);
  for (const id of [versionActorId, versionApproverId, versionOwnerId]) {
    await pool.query(
      `INSERT INTO app_users (id, email, display_name)
      VALUES ($1, $2, 'Synthetic version test user')`,
      [id, `${id}@example.test`],
    );
  }
  await pool.query(`INSERT INTO app_funding_call_governance_policy (id)
    VALUES (1)`);
  await beforeMigration?.(pool);
  // LIKE does not copy triggers. Preserve the existing application guard so
  // migration backfills and later application writes obey concurrency rules.
  const applicationLifecycleMigration = readFileSync(
    path.resolve(
      process.cwd(),
      "drizzle/0083_application_domain_lifecycle.sql",
    ),
    "utf8",
  );
  await pool.query(
    applicationLifecycleMigration.slice(
      applicationLifecycleMigration.indexOf(
        "CREATE OR REPLACE FUNCTION protect_application_lifecycle",
      ),
    ),
  );
  const migration = readFileSync(
    path.resolve(
      process.cwd(),
      "drizzle/0183_funding_call_versioned_replacements.sql",
    ),
    "utf8",
  );
  await pool.query(migration);
  const businessSectorMigration = readFileSync(
    path.resolve(process.cwd(), "drizzle/0184_business_secondary_sector.sql"),
    "utf8",
  );
  await pool.query(businessSectorMigration);
  for (const name of [
    "0185_asset_version_metadata",
    "0186_funding_call_integration_versions",
    "0187_version_draft_sources",
  ]) {
    await pool.query(
      readFileSync(path.resolve(process.cwd(), `drizzle/${name}.sql`), "utf8"),
    );
  }
  const publicationMigration = readFileSync(
    path.resolve(process.cwd(), "drizzle/0070_funding_call_publication.sql"),
    "utf8",
  );
  await pool.query(
    publicationMigration.slice(
      publicationMigration.indexOf(
        "CREATE OR REPLACE FUNCTION protect_funding_call_publication_revision",
      ),
    ),
  );
}

export async function seedVersionBindings(pool: pg.Pool) {
  const formId = randomUUID();
  const formVersionId = randomUUID();
  const rulesId = randomUUID();
  const rulesVersionId = randomUUID();
  const workflowId = randomUUID();
  const workflowVersionId = randomUUID();
  await pool.query(
    `INSERT INTO app_form_definitions (id, code, name, purpose, created_by)
    VALUES ($1::uuid, $1::text, 'Synthetic application form', 'FUNDING_APPLICATION', $2)`,
    [formId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_form_versions
    (id, form_definition_id, version_number, status, created_by)
    VALUES ($1, $2, 1, 'PUBLISHED', $3)`,
    [formVersionId, formId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rule_sets (id, code, name, created_by)
    VALUES ($1::uuid, $1::text, 'Synthetic rules', $2)`,
    [rulesId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rule_set_versions
    (id, rule_set_id, version_number, status, created_by)
    VALUES ($1, $2, 1, 'PUBLISHED', $3)`,
    [rulesVersionId, rulesId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_workflow_definitions (id, code, name)
    VALUES ($1::uuid, $1::text, 'Synthetic workflow')`,
    [workflowId],
  );
  await pool.query(
    `INSERT INTO app_workflow_definition_versions
    (id, definition_id, version_number, status, created_by, metadata)
    VALUES ($1, $2::uuid, 1, 'PUBLISHED', $3,
      jsonb_build_object('code', $2::uuid::text, 'name', 'Synthetic workflow', 'description', ''))`,
    [workflowVersionId, workflowId, versionActorId],
  );
  await pool.query(
    `INSERT INTO app_workflow_stage_definitions
    (version_id, code, name, sequence, initial, applicant_status, applicant_label, applicant_description)
    VALUES ($1, 'REVIEW', 'Review', 1, true, 'UNDER_REVIEW', 'Review', '')`,
    [workflowVersionId],
  );
  return {
    formId,
    formVersionId,
    rulesId,
    rulesVersionId,
    workflowId,
    workflowVersionId,
  };
}

export async function seedVersionCall(pool: pg.Pool) {
  const bindings = await seedVersionBindings(pool);
  const callId = randomUUID();
  await pool.query(
    `INSERT INTO app_funding_calls (
    id, reference, slug, title, description,
    total_budget_envelope, minimum_grant_amount, maximum_grant_amount,
    opens_at, closes_at, status, created_by, updated_by,
    form_version_id, eligibility_rule_set_version_id, workflow_template_version_id,
    application_duplicate_policy
  ) VALUES ($1::uuid, upper($1::text), $1::text, 'Original version', '<p>Original terms</p>',
    1000000, 1000, 100000, '2000-01-01', '2100-01-01', 'APPROVED', $2, $2,
    $3, $4, $5, 'one_per_applicant')`,
    [
      callId,
      versionActorId,
      bindings.formVersionId,
      bindings.rulesVersionId,
      bindings.workflowVersionId,
    ],
  );
  return { callId, ...bindings };
}
