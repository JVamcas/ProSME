import type { Pool, PoolClient } from "pg";
import { serializeSubmissionSnapshot } from "@/modules/applications/domain/ApplicationSubmissionSnapshot";
import {
  formContextIds as id,
  installWorkflowEligibilityFormContextFixture,
} from "./WorkflowEligibilityFormContextFixture";

export const reportProjectionIds = {
  role: crypto.randomUUID(),
  action: crypto.randomUUID(),
  actionDefinition: crypto.randomUUID(),
  formVersion: "",
  decision: crypto.randomUUID(),
  hold: crypto.randomUUID(),
};

export async function withReportingFixtureTransaction(
  pool: Pool,
  work: (client: PoolClient) => Promise<void>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `SELECT set_config('app.reporting_actor', $1, true),
        set_config('app.reporting_dataset', 'workflow-operations', true),
        set_config('app.reporting_run_at', '2026-10-08T12:00:00Z', true)`,
      [id.actor],
    );
    await work(client);
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
}

export async function installReportingPauseFixture(client: PoolClient) {
  for (const interval of [
    { scope: "STAGE", start: "2026-10-01T12:00:00Z", end: "2026-10-02T12:00:00Z" },
    { scope: "TASK", start: "2026-10-02T00:00:00Z", end: "2026-10-03T00:00:00Z" },
  ]) {
    const action = crypto.randomUUID();
    await client.query(
      `INSERT INTO app_workflow_action_executions
        (id, action_key, action_type, actor_type, actor_id, actor_identifier,
         workflow_instance_id, source_stage_instance_id, task_id, normalized_input,
         condition_evaluation, expected_runtime_version, resulting_runtime_version,
         result, idempotency_key, correlation_id)
       VALUES ($1, 'HOLD', 'HOLD', 'USER', $2, $2::uuid::text, $3, $4, $5,
         '{}', '{}', 1, 2, '{}', $1::uuid::text, $1)`,
      [action, id.actor, id.workflow, id.stageInstance, id.boundTask],
    );
    // The hold depends on the action audit row created immediately above.
    await client.query(
      `INSERT INTO app_workflow_holds
        (action_execution_id, workflow_instance_id, stage_instance_id, task_id, scope,
         previous_stage_status, status, held_by, held_at, resumed_by, resumed_at, comment)
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', 'RESUMED', $6, $7, $6, $8, 'Synthetic pause')`,
      [
        action,
        id.workflow,
        id.stageInstance,
        id.boundTask,
        interval.scope,
        id.actor,
        interval.start,
        interval.end,
      ],
    );
  }
}

export async function installReportingLaterDecision(client: PoolClient, outcome: string) {
  const action = crypto.randomUUID();
  await client.query(
    `INSERT INTO app_workflow_action_executions
      (id, action_key, action_type, actor_type, actor_id, actor_identifier,
       workflow_instance_id, source_stage_instance_id, task_id, normalized_input,
       condition_evaluation, expected_runtime_version, resulting_runtime_version,
       result, idempotency_key, correlation_id, executed_at)
     VALUES ($1, 'DECISION', $2, 'USER', $3, $3::uuid::text, $4, $5, $6,
       '{}', '{}', 2, 3, '{}', $1::uuid::text, $1, '2026-10-05T12:00:00Z')`,
    [
      action,
      outcome === "APPROVED" ? "APPROVE_ADVANCE" : "REJECT",
      id.actor,
      id.workflow,
      id.stageInstance,
      id.unboundTask,
    ],
  );
  await client.query(
    `INSERT INTO app_workflow_decisions
      (id, action_execution_id, action_definition_id, action_key, outcome, actor_id,
       workflow_instance_id, source_stage_instance_id, task_id, input, decided_at)
     VALUES ($1, $2, $3, 'DECISION', $4, $5, $6, $7, $8, '{}', '2026-10-05T12:00:00Z')`,
    [
      crypto.randomUUID(),
      action,
      reportProjectionIds.actionDefinition,
      outcome,
      id.actor,
      id.workflow,
      id.stageInstance,
      id.unboundTask,
    ],
  );
}

async function installSnapshot(client: PoolClient) {
  const values = {
    PROJECT_TITLE: "Submitted project",
    REQUESTED_GRANT_AMOUNT: "9999999999999999.99",
    TOTAL_PROJECT_COST: "9999999999999999.99",
    APPLICANT_COFUNDING_AMOUNT: "0.00",
    BUDGET_LINES: [{ amount: 1 }, { amount: 2 }],
    TEAM_MEMBERS: [{ name: "Synthetic A" }, { name: "Synthetic B" }],
  };
  const content = {
    application: {},
    applicant: {},
    declarations: {},
    documents: [],
    business: { legalName: "Submitted business", region: "Khomas", sector: "Services" },
    form: {
      normalizedValues: values,
      responseRowVersion: 1,
      versionId: reportProjectionIds.formVersion,
    },
    eligibilityRuleSetVersionId: id.rulesVersion,
    fundingCall: {},
    reference: "FORM-CONTEXT-001",
    schemaVersion: 1,
    submittedAt: "2026-10-01T08:00:00.000Z",
    workflowTemplateVersionId: id.version,
  };
  const serialized = serializeSubmissionSnapshot(content);
  const result = await client.query(
    `INSERT INTO app_application_submission_snapshots
      (application_id, application_row_version, response_row_version, form_version_id,
       eligibility_rule_set_version_id, workflow_template_version_id, schema_version,
       snapshot_content, canonical_content, integrity_hash, application_data, business_data,
       declaration_acceptance, document_versions, normalized_form_values, submitted_at)
     VALUES ($1, 1, 1, $2, $3, $4, 1, $5, $6, $7, '{}', $8, '{}', '[]', $9, $10) RETURNING id`,
    [
      id.application,
      reportProjectionIds.formVersion,
      id.rulesVersion,
      id.version,
      JSON.stringify(content),
      serialized.canonicalContent,
      serialized.integrityHash,
      JSON.stringify(content.business),
      JSON.stringify(values),
      content.submittedAt,
    ],
  );
  await client.query(
    `UPDATE app_applications SET submission_snapshot_id = $2, form_version_id = $3,
      business_section = '{"legalName":"Changed draft business"}',
      project_section = '{"PROJECT_TITLE":"Changed draft project"}', row_version = row_version + 1 WHERE id = $1`,
    [id.application, result.rows[0].id, reportProjectionIds.formVersion],
  );
}

async function installAward(client: PoolClient) {
  await client.query(
    `INSERT INTO app_form_responses
      (workflow_task_id, form_version_id, respondent_user_id, created_by, updated_by,
       status, completed_at, values, definition_snapshot)
     VALUES ($1, $2, $3, $3, $3, 'COMPLETED', '2026-10-04T12:00:00Z',
       '{"APPROVED_AMOUNT":"12345.67"}', jsonb_build_object('versionId', $2::uuid::text))`,
    [id.boundTask, reportProjectionIds.formVersion, id.actor],
  );
  await client.query(
    `INSERT INTO app_workflow_action_executions
      (id, action_key, action_type, actor_type, actor_id, actor_identifier,
       workflow_instance_id, source_stage_instance_id, task_id, normalized_input,
       condition_evaluation, expected_runtime_version, resulting_runtime_version,
       result, idempotency_key, correlation_id, executed_at)
     VALUES ($1, 'APPROVE', 'APPROVE_ADVANCE', 'USER', $2, $2::uuid::text, $3, $4, $5,
       '{}', '{}', 1, 2, '{}', $1::uuid::text, $1, '2026-10-04T12:00:00Z')`,
    [reportProjectionIds.action, id.actor, id.workflow, id.stageInstance, id.boundTask],
  );
  await client.query(
    `INSERT INTO app_workflow_decisions
      (id, action_execution_id, action_definition_id, action_key, outcome, actor_id,
       workflow_instance_id, source_stage_instance_id, task_id, input, decided_at)
     VALUES ($1, $2, $7, 'APPROVE', 'APPROVED', $3, $4, $5, $6, '{}', '2026-10-04T12:00:00Z')`,
    [
      reportProjectionIds.decision,
      reportProjectionIds.action,
      id.actor,
      id.workflow,
      id.stageInstance,
      id.boundTask,
      reportProjectionIds.actionDefinition,
    ],
  );
  await client.query(
    `UPDATE app_workflow_tasks SET status = 'COMPLETED', completed_at = '2026-10-04T12:00:00Z',
      assigned_user_id = $2, row_version = row_version + 1 WHERE id = $1`,
    [id.boundTask, id.otherActor],
  );
  await client.query(
    `INSERT INTO app_task_completion_commands
      (idempotency_key, task_instance_id, actor_id, result, completed_at, row_version, workflow_status)
     VALUES ($1, $2, $3, '{"taskStatus":"COMPLETED"}', '2026-10-04T12:00:00Z', 2, 'COMPLETED')`,
    [crypto.randomUUID(), id.boundTask, id.actor],
  );
  await client.query(
    `UPDATE app_workflow_instances SET status = 'COMPLETED', terminal_outcome = 'APPROVED',
      completed_at = '2026-10-04T12:00:00Z',
      public_status = '{"status":"COMPLETED","label":"Approved","description":"Approved"}' WHERE id = $1`,
    [id.workflow],
  );
}

export async function installReportingProjectionFixture(client: PoolClient) {
  const forms = await installWorkflowEligibilityFormContextFixture(
    client,
    async (connection) => {
      await connection.query(
        `INSERT INTO app_workflow_action_definitions
        (id, stage_id, stable_key, label, action_type, display_order, configuration)
       VALUES ($1, $2, 'APPROVE', 'Approve', 'APPROVE_ADVANCE', 1, '{}')`,
        [reportProjectionIds.actionDefinition, id.stage],
      );
      await connection.query(
        "UPDATE app_workflow_stage_definitions SET code = 'APPROVAL_AWARD_DECISION' WHERE id = $1",
        [id.stage],
      );
      await connection.query(
        `UPDATE app_form_definitions SET code = 'APPROVAL' WHERE id = (
        SELECT version.form_definition_id FROM app_form_versions version
        JOIN app_stage_task_form_bindings binding ON binding.form_version_id = version.id
        WHERE binding.task_definition_id = $1 LIMIT 1)`,
        [id.boundDefinition],
      );
      const form = await connection.query(
        "SELECT form_version_id FROM app_stage_task_form_bindings WHERE task_definition_id = $1",
        [id.boundDefinition],
      );
      reportProjectionIds.formVersion = form.rows[0].form_version_id;
    },
    async () => ({ formVersionId: reportProjectionIds.formVersion, values: {} }),
  );
  reportProjectionIds.formVersion = forms.formVersionId;
  await client.query(
    "UPDATE app_workflow_stage_instances SET activated_at = '2026-10-01T00:00:00Z' WHERE id = $1",
    [id.stageInstance],
  );
  await client.query(
    "UPDATE app_workflow_tasks SET created_at = '2026-10-01T00:00:00Z', due_at = '2026-10-02T00:00:00Z' WHERE stage_instance_id = $1",
    [id.stageInstance],
  );
  await installSnapshot(client);
  await installAward(client);
  await client.query(
    "INSERT INTO app_roles(id, code, name) VALUES ($1, 'REPORT_TEST', 'Report test')",
    [reportProjectionIds.role],
  );
  await client.query("INSERT INTO app_user_roles(user_id, role_id) VALUES ($1, $2)", [
    id.actor,
    reportProjectionIds.role,
  ]);
  await client.query(
    `INSERT INTO app_role_capabilities(role_id, capability_id) SELECT $1, id FROM app_capabilities
     WHERE code IN ('reporting.dataset.read.all', 'reporting.query.execute.all',
       'funding.application.all.read', 'workflow.instance.all.read', 'reporting.website.read.all')`,
    [reportProjectionIds.role],
  );
  return id;
}
