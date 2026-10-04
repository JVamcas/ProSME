import type { PoolClient } from "pg";
import {
  formContextIds as id,
  installWorkflowEligibilityFormContextFixture,
} from "./WorkflowEligibilityFormContextFixture";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import { serializeSubmissionSnapshot } from "@/modules/applications/domain/ApplicationSubmissionSnapshot";

export const deadlineFixtureIds = {
  rfiAction: crypto.randomUUID(),
  escalationAction: crypto.randomUUID(),
  returnAction: crypto.randomUUID(),
  reworkStage: crypto.randomUUID(),
  reworkTask: crypto.randomUUID(),
  actionExecution: crypto.randomUUID(),
  reviewerRole: crypto.randomUUID(),
};

async function configureDraft(client: PoolClient) {
  const extra = deadlineFixtureIds;
  await client.query(
    "INSERT INTO app_roles (id, code, name) VALUES ($1, $2, 'Deadline reviewer')",
    [extra.reviewerRole, `DEADLINE_${extra.reviewerRole.replaceAll("-", "_")}`],
  );
  await client.query(
    `INSERT INTO app_capabilities (code) VALUES
      ('workflow.task.assigned.read'), ('workflow.task.assigned.process'), ('workflow.task.assigned.decide')
     ON CONFLICT (code) DO NOTHING`,
  );
  await client.query(
    `INSERT INTO app_role_capabilities (role_id, capability_id)
     SELECT $1, id FROM app_capabilities WHERE code IN
       ('workflow.task.assigned.read', 'workflow.task.assigned.process', 'workflow.task.assigned.decide')`,
    [extra.reviewerRole],
  );
  await client.query(
    "INSERT INTO app_user_roles (user_id, role_id) VALUES ($1, $2)",
    [id.otherActor, extra.reviewerRole],
  );
  await client.query(
    `INSERT INTO app_workflow_action_definitions
      (id, stage_id, stable_key, label, action_type, display_order, configuration)
     VALUES ($1, $4, 'REQUEST_INFO', 'Request information', 'REQUEST_INFORMATION', 1,
       '{"continuation":"RESUME_SOURCE_TASK","deadlineDays":10,"editableFieldPaths":["project.description"],
         "reminderDayOffsets":[1,3],"expiryAction":"CLOSE_REQUEST", "participantScope":"APPLICATION_OWNER_AND_REQUESTER",
         "recipientScope":"APPLICATION_OWNER"}'),
       ($2, $4, 'ESCALATE', 'Escalate', 'ESCALATE', 2, $5),
       ($3, $4, 'RETURN', 'Return', 'RETURN', 3, '{"dataHandling":"CLEAR"}')`,
    [
      extra.rfiAction,
      extra.escalationAction,
      extra.returnAction,
      id.stage,
      JSON.stringify({
        blockUntilResolved: true,
        responsibility: "TRANSFER",
        targetType: "USER",
        targetId: id.otherActor,
        trigger: "MANUAL",
      }),
    ],
  );
  await client.query(
    `INSERT INTO app_stage_task_action_bindings (task_definition_id, stage_id, action_key)
     VALUES ($1, $2, 'REQUEST_INFO'), ($1, $2, 'ESCALATE'), ($1, $2, 'RETURN')`,
    [id.unboundDefinition, id.stage],
  );
  await client.query(
    `INSERT INTO app_workflow_stage_definitions
      (id, version_id, code, name, sequence, repeatable, applicant_status, applicant_label, applicant_description)
     VALUES ($1, $2, 'REWORK', 'Rework', 2, true, 'UNDER_REVIEW', 'Under review', 'Rework in progress')`,
    [extra.reworkStage, id.version],
  );
  await client.query(
    `INSERT INTO app_stage_task_definitions
      (id, stage_id, code, name, sequence, assignment_user_id, assignment_mode, permissions)
     VALUES ($1, $2, 'REWORK_TASK', 'Rework task', 1, $3, 'NAMED_USER', $4)`,
    [
      extra.reworkTask,
      extra.reworkStage,
      id.otherActor,
      JSON.stringify(defaultWorkflowElementPermissions),
    ],
  );
  const transition = await client.query(
    `INSERT INTO app_workflow_transition_definitions (version_id, from_stage_id, action_key, priority)
     VALUES ($1, $2, 'RETURN', 1) RETURNING id`,
    [id.version, id.stage],
  );
  await client.query(
    `INSERT INTO app_workflow_transition_targets (transition_id, target_stage_id) VALUES ($1, $2)`,
    [transition.rows[0].id, extra.reworkStage],
  );
}

export async function installWorkflowDeadlineFixture(
  client: PoolClient,
  prepareApplication?: () => Promise<{
    formVersionId: string;
    values: Record<string, unknown>;
    businessId?: string;
  }>,
) {
  const forms = await installWorkflowEligibilityFormContextFixture(
    client,
    configureDraft,
    prepareApplication,
  );
  await client.query(
    "UPDATE app_workflow_tasks SET form_version_id = NULL WHERE id = $1",
    [id.unboundTask],
  );
  const snapshot = serializeSubmissionSnapshot({
    application: {},
    applicant: {},
    business: {},
    declarations: {},
    documents: [],
    eligibilityRuleSetVersionId: id.rulesVersion,
    form: {
      normalizedValues: {},
      responseRowVersion: 1,
      versionId: forms.formVersionId,
    },
    fundingCall: {
      id: id.call,
      terms: {
        title: "First call",
        maximumGrantAmount: 100000,
        minimumGrantAmount: 10000,
      },
    },
    reference: "FORM-CONTEXT-001",
    schemaVersion: 1,
    submittedAt: new Date().toISOString(),
    workflowTemplateVersionId: id.version,
  });
  const inserted = await client.query(
    `INSERT INTO app_application_submission_snapshots
      (application_id, application_row_version, response_row_version, form_version_id,
       eligibility_rule_set_version_id, workflow_template_version_id, schema_version,
       snapshot_content, canonical_content, integrity_hash, application_data, business_data,
       declaration_acceptance, document_versions, normalized_form_values, submitted_at)
     VALUES ($1, 1, 1, $2, $3, $4, 1, $5, $6, $7, '{}', '{}', '{}', '[]', '{}', now()) RETURNING id`,
    [
      id.application,
      forms.formVersionId,
      id.rulesVersion,
      id.version,
      JSON.stringify(snapshot.snapshotContent),
      snapshot.canonicalContent,
      snapshot.integrityHash,
    ],
  );
  await client.query(
    "UPDATE app_applications SET submission_snapshot_id = $2, row_version = row_version + 1 WHERE id = $1",
    [id.application, inserted.rows[0].id],
  );
  await client.query(
    `INSERT INTO app_workflow_action_executions
      (id, action_key, action_type, actor_type, actor_id, actor_identifier, workflow_instance_id,
       source_stage_instance_id, task_id, normalized_input, condition_evaluation, expected_runtime_version,
       resulting_runtime_version, result, idempotency_key, correlation_id)
     VALUES ($1::uuid, 'TEST_CONTROL', 'PUT_ON_HOLD', 'USER', $2::uuid, $2::uuid::text, $3, $4, $5,
       '{}', '{}', 1, 2, '{}', $1::uuid::text, $6)`,
    [
      deadlineFixtureIds.actionExecution,
      id.actor,
      id.workflow,
      id.stageInstance,
      id.unboundTask,
      crypto.randomUUID(),
    ],
  );
}

export async function insertDeadlineRfi(
  client: PoolClient,
  expiryAction: "CLOSE_REQUEST" | "ESCALATE" | "RETURN" = "CLOSE_REQUEST",
  expired = true,
) {
  const result = await client.query(
    `INSERT INTO app_workflow_rfis
      (application_id, workflow_instance_id, stage_instance_id, task_id, action_definition_id,
       requester_id, recipient_user_id, initiation_type, question, instructions, deadline_at,
       expiry_action, continuation_behavior, idempotency_key, correlation_id, created_at, reminder_day_offsets)
     VALUES ($1, $2, $3, $4, $5, $6, $6, 'MANUAL', 'Supply information', 'Supply information',
       now() + $7::integer * interval '1 day', $8, 'RESUME_SOURCE_TASK', $9, $10,
       now() - interval '4 days', '[1,3]') RETURNING id`,
    [
      id.application,
      id.workflow,
      id.stageInstance,
      id.unboundTask,
      deadlineFixtureIds.rfiAction,
      id.actor,
      expired ? -1 : 5,
      expiryAction,
      crypto.randomUUID(),
      crypto.randomUUID(),
    ],
  );
  return result.rows[0].id as string;
}
