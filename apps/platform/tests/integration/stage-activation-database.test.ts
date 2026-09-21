import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { activateStage } from "@/modules/workflows/application/runtime/ServerStageActivationService";

const { Pool } = pg;
const enabled = process.env.RUN_STAGE_ACTIVATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const actorId = "a1111111-1111-4111-8111-111111111111";
const definitionId = "a2222222-2222-4222-8222-222222222222";
const versionId = "a3333333-3333-4333-8333-333333333333";
const stageId = "a4444444-4444-4444-8444-444444444444";
const taskDefinitionId = "a5555555-5555-4555-8555-555555555555";
const fundingCallId = "a6666666-6666-4666-8666-666666666666";
const applicationId = "a7777777-7777-4777-8777-777777777777";
const workflowInstanceId = "a8888888-8888-4888-8888-888888888888";
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The stage activation database is not configured.");
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'stage-activation@example.test', 'Stage Actor', 'staff', 'active')`,
    [actorId],
  );
  await query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, 'STAGE_ACTIVATION', 'Stage activation workflow')`,
    [definitionId],
  );
  await query(
    `INSERT INTO app_workflow_definition_versions
       (id, definition_id, version_number, status, created_by)
     VALUES ($1, $2, 1, 'DRAFT', $3)`,
    [versionId, definitionId, actorId],
  );
  await query(
    `INSERT INTO app_workflow_stage_definitions
       (id, version_id, code, name, sequence, initial, applicant_status,
        applicant_label, applicant_description, sla_hours, entry_condition)
     VALUES ($1, $2, 'SCREENING', 'Screening', 1, true, 'UNDER_REVIEW',
       'Under review', 'Screening in progress.', 24,
       '{"id":"entry-group","kind":"GROUP","combinator":"AND","children":[{"id":"amount-condition","kind":"CONDITION","leftOperand":{"kind":"FIELD","key":"application.requested_amount"},"operator":"LESS_THAN_OR_EQUAL","rightOperand":{"kind":"FIELD","key":"fundingCall.maximum_amount"}}]}'::jsonb)`,
    [stageId, versionId],
  );
  await query(
    `INSERT INTO app_stage_task_definitions
       (id, stage_id, code, name, type, sequence, required, assignment_user_id,
        permissions)
     VALUES ($1, $2, 'REVIEW', 'Review application', 'CHECKLIST', 1, true, $3,
       '{"view":"workflow.task.assigned.read","edit":"workflow.task.assigned.process","decide":"workflow.task.assigned.decide","visibility":"INTERNAL_ONLY"}'::jsonb)`,
    [taskDefinitionId, stageId, actorId],
  );
  await query(
    `UPDATE app_workflow_definition_versions
     SET status = 'PENDING_APPROVAL', row_version = 2 WHERE id = $1`,
    [versionId],
  );
  await query(
    `UPDATE app_workflow_definition_versions
     SET status = 'APPROVED', row_version = 3 WHERE id = $1`,
    [versionId],
  );
  await query(
    `UPDATE app_workflow_definition_versions
     SET status = 'PUBLISHED', row_version = 4, published_by = $2,
       published_at = now() WHERE id = $1`,
    [versionId, actorId],
  );
  await query(
    `INSERT INTO app_funding_calls
       (id, reference, slug, title, description, total_budget_envelope,
        minimum_grant_amount, maximum_grant_amount, opens_at, closes_at,
        status, workflow_template_version_id, created_by, updated_by)
     VALUES ($1, 'ACTIVATION-FUND', 'activation-fund', 'Activation Fund', 'Test',
       1000000, 10000, 100000, now() - interval '1 day',
       now() + interval '1 day', 'OPEN', $2, $3, $3)`,
    [fundingCallId, versionId, actorId],
  );
  await query(
    `INSERT INTO app_applications
       (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
        status, financial_section)
     VALUES ($1, $2, $3, 'Activation Fund', 'submitted',
       '{"requestedAmount":75000}'::jsonb)`,
    [applicationId, actorId, fundingCallId],
  );
  await query(
    `INSERT INTO app_workflow_instances
       (id, application_id, workflow_template_version_id)
     VALUES ($1, $2, $3)`,
    [workflowInstanceId, applicationId, versionId],
  );
});

afterAll(async () => pool?.end());

describeDatabase("stage activation persistence", () => {
  it("condition-gates one atomic stage, task, event, and audit", async () => {
    const command = {
      actorId,
      correlationId: "a9999999-9999-4999-8999-999999999999",
      stageDefinitionId: stageId,
      workflowInstanceId,
    };
    const activated = await activateStage(command);
    const replay = await activateStage(command);

    expect(activated).toMatchObject({ kind: "activated" });
    expect(replay).toMatchObject({
      kind: "already_active",
      stageInstanceId: activated.kind === "activated"
        ? activated.stageInstanceId
        : "",
    });
    const counts = await query(
      `SELECT
        (SELECT count(*)::integer FROM app_workflow_stage_instances
          WHERE workflow_instance_id = $1) AS stages,
        (SELECT count(*)::integer FROM app_workflow_tasks task
          JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
          WHERE stage.workflow_instance_id = $1) AS tasks,
        (SELECT count(*)::integer FROM app_workflow_events
          WHERE workflow_instance_id = $1 AND event_code = 'STAGE_ACTIVATED') AS events,
        (SELECT count(*)::integer FROM app_workflow_audit_entries
          WHERE action = 'STAGE_ACTIVATED') AS audits`,
      [workflowInstanceId],
    );
    expect(counts.rows[0]).toEqual({
      audits: 1,
      events: 1,
      stages: 1,
      tasks: 1,
    });
  });
});
