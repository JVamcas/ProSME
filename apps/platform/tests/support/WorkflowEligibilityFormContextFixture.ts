import type { PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { createEligibilityVerificationForm } from "@/modules/eligibility/infrastructure/EligibilityVerificationFormRepository";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

export const formContextIds = {
  actor: crypto.randomUUID(),
  otherActor: crypto.randomUUID(),
  definition: crypto.randomUUID(),
  version: crypto.randomUUID(),
  stage: crypto.randomUUID(),
  coiDefinition: crypto.randomUUID(),
  coiVersion: crypto.randomUUID(),
  ruleset: crypto.randomUUID(),
  rulesVersion: crypto.randomUUID(),
  otherRulesVersion: crypto.randomUUID(),
  call: crypto.randomUUID(),
  secondCall: crypto.randomUUID(),
  application: crypto.randomUUID(),
  workflow: crypto.randomUUID(),
  stageInstance: crypto.randomUUID(),
  inheritedDefinition: crypto.randomUUID(),
  commandDefinition: crypto.randomUUID(),
  boundDefinition: crypto.randomUUID(),
  unboundDefinition: crypto.randomUUID(),
  inheritedTask: crypto.randomUUID(),
  commandTask: crypto.randomUUID(),
  boundTask: crypto.randomUUID(),
  unboundTask: crypto.randomUUID(),
};

export async function installWorkflowEligibilityFormContextFixture(
  pool: PoolClient,
  configureDraft?: (pool: PoolClient) => Promise<void>,
) {
  const id = formContextIds;
  await pool.query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, $3, 'Form reviewer', 'staff', 'active'),
       ($2, $4, 'Other reviewer', 'staff', 'active')`,
    [id.actor, id.otherActor, `${id.actor}@example.test`, `${id.otherActor}@example.test`],
  );
  await pool.query(
    `INSERT INTO app_eligibility_rule_sets (id, code, name, created_by)
     VALUES ($1, $3, 'Eligibility baseline', $2)`,
    [id.ruleset, id.actor, `FORM_CONTEXT_${id.ruleset.replaceAll("-", "_").toUpperCase()}`],
  );
  const database = drizzle(pool);
  const forms = [];
  for (const [index, versionId] of [id.rulesVersion, id.otherRulesVersion].entries()) {
    // Only one draft is allowed; publish each version before creating the next.
    await pool.query(
      `INSERT INTO app_eligibility_rule_set_versions
        (id, rule_set_id, version_number, created_by)
       VALUES ($1, $2, $3, $4)`,
      [versionId, id.ruleset, index + 1, id.actor],
    );
    forms.push(await createEligibilityVerificationForm(
      database as never,
      {
        actorId: id.actor,
        ruleSetCode: "FORM_CONTEXT_RULES",
        ruleSetName: "Eligibility baseline",
        versionId,
        versionNumber: index + 1,
      },
    ));
    await pool.query(
      `UPDATE app_eligibility_rule_set_versions SET status = 'PUBLISHED',
        published_by = $2, published_at = now(), row_version = row_version + 1
       WHERE id = $1`,
      [versionId, id.actor],
    );
  }
  await pool.query(
    `INSERT INTO app_form_definitions (id, code, name, purpose, created_by)
     VALUES ($1, $3, 'COI declaration', 'COI', $2)`,
    [id.coiDefinition, id.actor, `COI_${id.coiDefinition.replaceAll("-", "_").toUpperCase()}`],
  );
  await pool.query(
    `INSERT INTO app_form_versions (id, form_definition_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [id.coiVersion, id.coiDefinition, id.actor],
  );
  await pool.query(
    `UPDATE app_form_versions SET status = 'PUBLISHED', published_by = $2,
      published_at = now(), row_version = row_version + 1 WHERE id = $1`,
    [id.coiVersion, id.actor],
  );
  await pool.query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, $2, 'Form context workflow')`,
    [id.definition, `FORM_CONTEXT_${id.definition.replaceAll("-", "_").toUpperCase()}`],
  );
  await pool.query(
    `INSERT INTO app_workflow_definition_versions
      (id, definition_id, version_number, created_by)
     VALUES ($1, $2, 1, $3)`,
    [id.version, id.definition, id.actor],
  );
  await pool.query(
    `INSERT INTO app_workflow_stage_definitions
      (id, version_id, code, name, sequence, initial,
       applicant_status, applicant_label, applicant_description, coi_gated, coi_form_version_id)
     VALUES ($1, $2, 'SCREENING', 'Screening', 1, true,
       'UNDER_REVIEW', 'Under review', 'Screening in progress', true, $3)`,
    [id.stage, id.version, id.coiVersion],
  );
  await pool.query(
    `INSERT INTO app_stage_task_definitions
      (id, stage_id, code, name, sequence, config, permissions)
     VALUES
      ($1, $5, 'INHERITED', 'Inherited eligibility', 1,
       '{"formPurpose":"ELIGIBILITY_VERIFICATION"}', $6::jsonb),
      ($2, $5, 'EVALUATE', 'Evaluate eligibility', 2,
       '{"command":"AUTHORITATIVE_ELIGIBILITY"}', $6::jsonb),
      ($3, $5, 'BOUND', 'Bound review form', 3, '{}', $6::jsonb),
      ($4, $5, 'UNBOUND', 'Unbound review form', 4, '{}', $6::jsonb)`,
    [id.inheritedDefinition, id.commandDefinition, id.boundDefinition, id.unboundDefinition,
      id.stage, JSON.stringify(defaultWorkflowElementPermissions)],
  );
  await pool.query(
    `INSERT INTO app_stage_task_form_bindings
      (task_definition_id, form_version_id, context_fields)
     VALUES ($1, $2, '[{"key":"application.reference","label":"Reference","type":"TEXT"}]')`,
    [id.boundDefinition, forms[0]],
  );
  await configureDraft?.(pool);
  for (const status of ["PENDING_APPROVAL", "APPROVED", "PUBLISHED"]) {
    await pool.query(
      `UPDATE app_workflow_definition_versions SET status = $2,
        published_by = CASE WHEN $2 = 'PUBLISHED' THEN $3::uuid ELSE NULL END,
        published_at = CASE WHEN $2 = 'PUBLISHED' THEN now() ELSE NULL END,
        row_version = row_version + 1 WHERE id = $1`,
      [id.version, status, id.actor],
    );
  }
  await pool.query(
    `INSERT INTO app_funding_calls
      (id, reference, slug, title, description, total_budget_envelope,
       minimum_grant_amount, maximum_grant_amount, opens_at, closes_at,
       workflow_template_version_id, eligibility_rule_set_version_id, created_by, updated_by)
     VALUES
      ($1, 'FORM-CONTEXT-ONE', 'form-context-one', 'First call', 'Test',
       1000000, 10000, 100000, now(), now() + interval '1 day', $3, $4, $6, $6),
      ($2, 'FORM-CONTEXT-TWO', 'form-context-two', 'Second call', 'Test',
       1000000, 10000, 100000, now(), now() + interval '1 day', $3, $5, $6, $6)`,
    [id.call, id.secondCall, id.version, id.rulesVersion, id.otherRulesVersion, id.actor],
  );
  await pool.query(
    `INSERT INTO app_applications
      (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
       eligibility_rule_set_version_id, status, submitted_at, reference)
     VALUES ($1, $2, $3, 'First call', $4, 'submitted', now(), 'FORM-CONTEXT-001')`,
    [id.application, id.actor, id.call, id.rulesVersion],
  );
  await pool.query(
    `INSERT INTO app_workflow_instances (id, application_id, workflow_template_version_id)
     VALUES ($1, $2, $3)`,
    [id.workflow, id.application, id.version],
  );
  await pool.query(
    `INSERT INTO app_workflow_stage_instances
      (id, workflow_instance_id, workflow_stage_definition_id, activated_at)
     VALUES ($1, $2, $3, now())`,
    [id.stageInstance, id.workflow, id.stage],
  );
  await pool.query(
    `INSERT INTO app_workflow_tasks
      (id, workflow_task_definition_id, stage_instance_id, assigned_user_id, form_version_id)
     VALUES ($1, $5, $9, $10, $11), ($2, $6, $9, $10, $11),
       ($3, $7, $9, $10, $11), ($4, $8, $9, $10, $11)`,
    [id.inheritedTask, id.commandTask, id.boundTask, id.unboundTask,
      id.inheritedDefinition, id.commandDefinition, id.boundDefinition, id.unboundDefinition,
      id.stageInstance, id.actor, forms[0]],
  );
  await pool.query(
    `INSERT INTO app_workflow_application_coi
      (task_id, user_id, application_id, form_version_id, state)
     VALUES ($1, $2, $3, $4, 'CLEARED_NO_CONFLICT')`,
    [id.inheritedTask, id.actor, id.application, id.coiVersion],
  );
  return { formVersionId: forms[0], otherFormVersionId: forms[1] };
}
