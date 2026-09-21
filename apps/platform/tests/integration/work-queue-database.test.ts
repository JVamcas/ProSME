import { randomUUID } from "node:crypto";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  readAdminApplication,
  readAdminApplications,
} from "@/db/repositories/AdminApplicationRepository";
import {
  readWorkQueue,
  writeTaskClaim,
} from "@/db/repositories/WorkQueueRepository";
import { writeChecklistTaskCompletion } from "@/db/repositories/WorkflowTaskActionRepository";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { configureWorkflowAction } from "./support/workflow-action-fixture";

const { Pool } = pg;
const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const testToken = randomUUID().replaceAll("-", "").slice(0, 12);
const applicantId = randomUUID();
const reviewerOneId = randomUUID();
const reviewerTwoId = randomUUID();
const definitionId = randomUUID();
const versionId = randomUUID();
const stageDefinitionId = randomUUID();
const taskDefinitionId = randomUUID();
const nextStageDefinitionId = randomUUID();
const nextTaskDefinitionId = randomUUID();
const applicationId = randomUUID();
const workflowId = randomUUID();
const stageInstanceId = randomUUID();
const taskInstanceId = randomUUID();
const fundingOpportunityId = Math.floor(Date.now() / 1000);
const reference = `SMEF-TEST-${testToken}`;
let claimedBy = "";
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The P3.5 PostgreSQL test pool is not configured.");
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status) VALUES
      ($1, $4, 'Queue Applicant', 'applicant', 'active'),
      ($2, $5, 'Reviewer One', 'staff', 'active'),
      ($3, $6, 'Reviewer Two', 'staff', 'active')`,
    [applicantId, reviewerOneId, reviewerTwoId,
      `applicant-${testToken}@example.test`, `one-${testToken}@example.test`,
      `two-${testToken}@example.test`],
  );
  await query(
    `INSERT INTO app_user_roles (user_id, role_id)
     SELECT reviewer.id, role.id
     FROM app_users reviewer CROSS JOIN app_roles role
     WHERE reviewer.id IN ($1, $2) AND role.code = 'programme_officer'`,
    [reviewerOneId, reviewerTwoId],
  );
  await query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, $2, 'Queue test workflow')`,
    [definitionId, `QUEUE_TEST_${testToken.toUpperCase()}`],
  );
  await query(
    `INSERT INTO app_workflow_definition_versions
      (id, definition_id, version_number, status, created_by, published_by, published_at)
     VALUES ($1, $2, 1, 'PUBLISHED', $3, $3, now())`,
    [versionId, definitionId, reviewerOneId],
  );
  await query(
    `INSERT INTO app_workflow_stage_definitions
      (id, version_id, code, name, sequence, initial, applicant_status,
       applicant_label, applicant_description, sla_hours)
     VALUES ($1, $2, 'SCREEN', 'Completeness screening', 1, true,
       'UNDER_REVIEW', 'Under review', 'Your application is under review.', 48)`,
    [stageDefinitionId, versionId],
  );
  await query(
    `INSERT INTO app_workflow_stage_definitions
      (id, version_id, code, name, sequence, initial, applicant_status,
       applicant_label, applicant_description, sla_hours)
     VALUES ($1, $2, 'ASSESS', 'Technical assessment', 2, false,
       'UNDER_ASSESSMENT', 'In assessment', 'Assessment is in progress.', 72)`,
    [nextStageDefinitionId, versionId],
  );
  await query(
    `INSERT INTO app_stage_task_definitions
      (id, stage_id, code, name, type, sequence, required, assignment_role_id, config)
     SELECT $1, $2, 'CHECK_COMPLETENESS', 'Check completeness', 'CHECKLIST',
       1, true, role.id,
       '{"items":[{"code":"OWNERSHIP","label":"Ownership confirmed","required":true}]}'::jsonb
     FROM app_roles role WHERE role.code = 'programme_officer'`,
    [taskDefinitionId, stageDefinitionId],
  );
  await query(
    `INSERT INTO app_stage_task_definitions
      (id, stage_id, code, name, type, sequence, required, assignment_role_id, config)
     SELECT $1, $2, 'ASSESS_APPLICATION', 'Assess application', 'ASSESSMENT_FORM',
       1, true, role.id,
       '{"criteria":[{"code":"FIT","label":"Fit","maximumScore":10,"weight":1,"commentRequired":false}]}'::jsonb
     FROM app_roles role WHERE role.code = 'programme_officer'`,
    [nextTaskDefinitionId, nextStageDefinitionId],
  );
  await configureWorkflowAction(query, {
    nextStageDefinitionId,
    stageDefinitionId,
    taskDefinitionId,
    versionId,
  });
  await query(
    `INSERT INTO app_applications
      (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
       status, reference, workflow_version_id, submitted_at, financial_section)
     VALUES ($1, $2, $4, 'Database funding call', 'submitted',
       $5, $3, '2000-01-01T08:00:00Z',
       '{"amountRequested":80000}'::jsonb)`,
    [applicationId, applicantId, versionId, fundingOpportunityId, reference],
  );
  await query(
    `INSERT INTO app_funding_opportunity_workflows
      (funding_opportunity_id, funding_opportunity_title, workflow_version_id, assigned_by)
     VALUES ($3, 'Database funding call', $1, $2)`,
    [versionId, reviewerOneId, fundingOpportunityId],
  );
  await query(
    `INSERT INTO app_workflow_instances
      (id, application_id, workflow_template_version_id, current_stage_instance_id)
     VALUES ($1, $2, $3, NULL)`,
    [workflowId, applicationId, versionId],
  );
  await query(
    `INSERT INTO app_workflow_stage_instances
      (id, workflow_instance_id, workflow_stage_definition_id, status)
     VALUES ($1, $2, $3, 'ACTIVE')`,
    [stageInstanceId, workflowId, stageDefinitionId],
  );
  await query(
    `UPDATE app_workflow_instances SET current_stage_instance_id = $1 WHERE id = $2`,
    [stageInstanceId, workflowId],
  );
  await query(
    `INSERT INTO app_workflow_tasks
      (id, stage_instance_id, workflow_task_definition_id, type_snapshot,
       status, assigned_role_id, due_at)
     SELECT $1, $2, $3, 'CHECKLIST', 'PENDING', role.id, now() + interval '24 hours'
     FROM app_roles role WHERE role.code = 'programme_officer'`,
    [taskInstanceId, stageInstanceId, taskDefinitionId],
  );
});

afterAll(async () => pool?.end());

describeDatabase("P3.5 work queue projections and claim", () => {
  it("projects only bounded queue and application list fields", async () => {
    const queue = await readWorkQueue(reviewerOneId, {
      limit: 25,
      search: reference,
      scope: "mine",
    });
    expect(queue.total).toBe(1);
    expect(queue.items[0]).toMatchObject({
      applicantName: "Queue Applicant",
      reference,
      stageName: "Completeness screening",
      taskName: "Check completeness",
    });
    expect(queue.items[0]).not.toHaveProperty("result");

    const applications = await readAdminApplications({
      actorId: reviewerOneId,
      filters: { limit: 25, search: reference, status: "under-review" },
      visibility: "assigned",
    });
    expect(applications.total).toBe(1);
    expect(applications.items[0]).toMatchObject({
      activeTaskCount: 1,
      fundingCallTitle: "Database funding call",
      requestedAmount: 80000,
    });
    const application = await readAdminApplication({
      actorId: reviewerOneId,
      applicationId,
      visibility: "assigned",
    });
    expect(application).toMatchObject({
      applicantName: "Queue Applicant",
      currentStageName: "Completeness screening",
    });
  });

  it("allows exactly one reviewer to atomically claim a role task", async () => {
    const keys = [
      randomUUID(),
      randomUUID(),
    ];
    const results = await Promise.all([
      writeTaskClaim({
        actorId: reviewerOneId,
        correlationId: randomUUID(),
        expectedRowVersion: 1,
        idempotencyKey: keys[0],
        taskId: taskInstanceId,
      }),
      writeTaskClaim({
        actorId: reviewerTwoId,
        correlationId: randomUUID(),
        expectedRowVersion: 1,
        idempotencyKey: keys[1],
        taskId: taskInstanceId,
      }),
    ]);
    expect(results.map((result) => result.kind).sort()).toEqual([
      "claimed",
      "conflict",
    ]);
    const winner = results.findIndex((result) => result.kind === "claimed");
    const winnerId = winner === 0 ? reviewerOneId : reviewerTwoId;
    claimedBy = winnerId;
    const replay = await writeTaskClaim({
      actorId: winnerId,
      correlationId: randomUUID(),
      expectedRowVersion: 1,
      idempotencyKey: keys[winner],
      taskId: taskInstanceId,
    });
    expect(replay).toMatchObject({ kind: "claimed" });
    const persisted = await query(
      `SELECT assigned_user_id, assigned_role_id, status, row_version,
        claimed_at IS NOT NULL AS claimed,
        (SELECT count(*)::integer FROM app_workflow_audit_entries
          WHERE target_id = $1::text AND action = 'TASK_CLAIMED') AS audits
       FROM app_workflow_tasks WHERE id = $1::uuid`,
      [taskInstanceId],
    );
    expect(persisted.rows[0]).toMatchObject({
      assigned_role_id: null,
      assigned_user_id: winnerId,
      audits: 1,
      claimed: true,
      row_version: 2,
      status: "CLAIMED",
    });
  });

  it("completes the configured checklist and advances atomically", async () => {
    const task = await readWorkflowTask(claimedBy, taskInstanceId);
    expect(task).toMatchObject({
      fundingCallTitle: "Database funding call",
      taskType: "CHECKLIST",
    });
    const command = {
      actionKey: "ADVANCE",
      actorId: claimedBy,
      correlationId: randomUUID(),
      expectedRowVersion: 2,
      idempotencyKey: randomUUID(),
      items: [{ accepted: true, code: "OWNERSHIP", comment: "Verified" }],
      taskId: taskInstanceId,
    };
    const completed = await writeChecklistTaskCompletion(command);
    expect(completed).toMatchObject({
      kind: "completed",
      result: { nextStageName: "Technical assessment" },
    });
    expect(await writeChecklistTaskCompletion(command)).toEqual(completed);
    const persisted = await query(
      `SELECT task.status, task.result,
        workflow.status AS workflow_status,
        stage_definition.name AS current_stage,
        (SELECT count(*)::integer FROM app_workflow_tasks next_task
          JOIN app_workflow_stage_instances next_stage
            ON next_stage.id = next_task.stage_instance_id
          WHERE next_stage.workflow_instance_id = workflow.id
            AND next_stage.status = 'ACTIVE') AS next_tasks
       FROM app_workflow_tasks task
       JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
       JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
       JOIN app_workflow_stage_instances current_stage
         ON current_stage.id = workflow.current_stage_instance_id
       JOIN app_workflow_stage_definitions stage_definition
         ON stage_definition.id = current_stage.workflow_stage_definition_id
       WHERE task.id = $1`,
      [taskInstanceId],
    );
    expect(persisted.rows[0]).toMatchObject({
      current_stage: "Technical assessment",
      next_tasks: 1,
      status: "COMPLETED",
      workflow_status: "ACTIVE",
    });
  });
});
