import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { submitOwnedApplication } from "@/db/repositories/ApplicationSubmissionRepository";
import { readAdminDashboard } from "@/db/repositories/AdminDashboardRepository";

const { Pool } = pg;
const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const ownerId = "61111111-1111-4111-8111-111111111111";
const versionId = "62222222-2222-4222-8222-222222222222";
const definitionId = "63333333-3333-4333-8333-333333333333";
const stageId = "64444444-4444-4444-8444-444444444444";
const taskId = "65555555-5555-4555-8555-555555555555";
const applicationIds = [
  "66666666-6666-4666-8666-666666666661",
  "66666666-6666-4666-8666-666666666662",
  "66666666-6666-4666-8666-666666666663",
];
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The P3.4 PostgreSQL test pool is not configured.");
  return pool.query(text, values);
}

const requiredTypes = [
  "business-registration",
  "financial-statements",
  "project-proposal",
] as const;

beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'submission-owner@example.test', 'Submission Owner', 'applicant', 'active')`,
    [ownerId],
  );
  await query(
    `INSERT INTO app_workflow_definitions (id, code, name)
     VALUES ($1, 'SUBMISSION_TEST', 'Submission test workflow')`,
    [definitionId],
  );
  await query(
    `INSERT INTO app_workflow_definition_versions
       (id, definition_id, version_number, status, created_by, published_by, published_at)
     VALUES ($1, $2, 1, 'PUBLISHED', $3, $3, now())`,
    [versionId, definitionId, ownerId],
  );
  await query(
    `INSERT INTO app_workflow_stage_definitions
       (id, version_id, code, name, sequence, initial, applicant_status,
        applicant_label, applicant_description, sla_hours)
     VALUES ($1, $2, 'INITIAL', 'Initial review', 1, true, 'SUBMITTED',
       'Submitted', 'Your application was submitted.', 24)`,
    [stageId, versionId],
  );
  await query(
    `INSERT INTO app_stage_task_definitions
       (id, stage_id, code, name, type, sequence, required,
        assignment_user_id, config)
     VALUES ($1, $2, 'CHECK', 'Initial check', 'CHECKLIST', 1, true,
       $3,
       '{"items":[{"code":"received","label":"Application received","required":true}]}'::jsonb)`,
    [taskId, stageId, ownerId],
  );
  await query(
    `INSERT INTO app_funding_opportunity_workflows
       (funding_opportunity_id, funding_opportunity_title, workflow_version_id, assigned_by)
     VALUES
       (6101, 'Submission Fund', $1, $2),
       (6103, 'Rollback Fund', $1, $2)`,
    [versionId, ownerId],
  );
  for (let index = 0; index < applicationIds.length; index += 1) {
    await query(
      `INSERT INTO app_applications
        (id, owner_user_id, funding_opportunity_id, funding_opportunity_title,
         declarations_section, declaration_acceptance, section_completion)
       VALUES ($1, $2, $3, 'Submission test application',
         '{"accurate":true}'::jsonb,
         '{"acceptedAt":"2026-09-15T08:00:00.000Z","declarationVersion":"v1","privacyVersion":"v1"}'::jsonb,
         '{"business":true,"project":true,"financial":true,"documents":true,"declarations":true}'::jsonb)`,
      [applicationIds[index], ownerId, 6101 + index],
    );
    for (const documentType of requiredTypes) {
      await query(
        `INSERT INTO app_application_documents
          (application_id, owner_user_id, document_type, object_key,
           original_name, content_type, size_bytes, scan_status)
         VALUES ($1::uuid, $2::uuid, $3::text,
           $1::text || '/' || $3::text, $3::text || '.pdf',
           'application/pdf', 512, 'clean')`,
        [applicationIds[index], ownerId, documentType],
      );
    }
  }
});

afterAll(async () => pool?.end());

describeDatabase("P3.4 transactional application submission", () => {
  it("installs runtime, idempotency, event, and outbox records", async () => {
    const records = await query(
      `SELECT
        to_regclass('app_workflow_instances') AS workflow_instances,
        to_regclass('app_application_submission_commands') AS commands,
        to_regclass('app_transactional_outbox') AS outbox,
        to_regclass('app_applications_reference_unique') AS reference_index`,
    );
    expect(records.rows[0]).toEqual({
      commands: "app_application_submission_commands",
      outbox: "app_transactional_outbox",
      reference_index: "app_applications_reference_unique",
      workflow_instances: "app_workflow_instances",
    });
  });

  it("pins one published version and creates the initial runtime atomically", async () => {
    const [first, second] = await Promise.all([
      submitOwnedApplication({
        actorId: ownerId,
        applicationId: applicationIds[0],
        correlationId: "67777777-7777-4777-8777-777777777771",
        idempotencyKey: "concurrent-submission-one",
        requiredDocumentTypes: [...requiredTypes],
      }),
      submitOwnedApplication({
        actorId: ownerId,
        applicationId: applicationIds[0],
        correlationId: "67777777-7777-4777-8777-777777777772",
        idempotencyKey: "concurrent-submission-two",
        requiredDocumentTypes: [...requiredTypes],
      }),
    ]);
    expect(first.kind).toBe("submitted");
    expect(second.kind).toBe("submitted");
    if (first.kind !== "submitted" || second.kind !== "submitted") return;
    expect(first.result.reference).toBe(second.result.reference);
    expect(first.result.workflowInstanceId).toBe(second.result.workflowInstanceId);
    expect(first.result.workflowVersionId).toBe(versionId);

    const counts = await query(
      `SELECT
        (SELECT count(*)::integer FROM app_workflow_instances WHERE application_id = $1) AS workflows,
        (SELECT count(*)::integer FROM app_workflow_stage_instances stage
          JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
          WHERE workflow.application_id = $1) AS stages,
        (SELECT count(*)::integer FROM app_stage_task_instances task
          JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
          JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
          WHERE workflow.application_id = $1) AS tasks,
        (SELECT count(*)::integer FROM app_workflow_events event
          JOIN app_workflow_instances workflow ON workflow.id = event.workflow_instance_id
          WHERE workflow.application_id = $1) AS events,
        (SELECT count(*)::integer FROM app_workflow_audit_entries
          WHERE target_id = $1::text AND action = 'APPLICATION_SUBMITTED') AS audits,
        (SELECT count(*)::integer FROM app_transactional_outbox
          WHERE aggregate_id = $1) AS outbox`,
      [applicationIds[0]],
    );
    expect(counts.rows[0]).toEqual({
      audits: 1,
      events: 1,
      outbox: 1,
      stages: 1,
      tasks: 1,
      workflows: 1,
    });
    await expect(
      query(`UPDATE app_stage_task_definitions SET name = 'Changed' WHERE id = $1`, [taskId]),
    ).rejects.toThrow("workflow versions with runtime instances are immutable");
    await expect(
      query(
        `UPDATE app_workflow_instances
         SET started_at = started_at + interval '1 second'
         WHERE application_id = $1`,
        [applicationIds[0]],
      ),
    ).rejects.toThrow("workflow instance version pin is immutable");
  });

  it("rejects a missing published assignment without partial writes", async () => {
    const result = await submitOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[1],
      correlationId: "67777777-7777-4777-8777-777777777773",
      idempotencyKey: "missing-workflow",
      requiredDocumentTypes: [...requiredTypes],
    });
    expect(result).toEqual({ kind: "workflow_unavailable" });
    const application = await query(
      `SELECT status, reference FROM app_applications WHERE id = $1`,
      [applicationIds[1]],
    );
    expect(application.rows[0]).toEqual({ reference: null, status: "draft" });
  });

  it("rolls back the reference and runtime when a later write fails", async () => {
    await query(
      `INSERT INTO app_transactional_outbox
        (event_code, aggregate_id, schema_version, payload, correlation_id)
       VALUES ('APPLICATION_SUBMISSION_CONFIRMATION_REQUESTED', $1, 1, '{}', $2)`,
      [applicationIds[2], "67777777-7777-4777-8777-777777777774"],
    );
    await expect(submitOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[2],
      correlationId: "67777777-7777-4777-8777-777777777775",
      idempotencyKey: "forced-rollback",
      requiredDocumentTypes: [...requiredTypes],
    })).rejects.toThrow();
    const state = await query(
      `SELECT status, reference,
        (SELECT count(*)::integer FROM app_workflow_instances
          WHERE application_id = $1) AS workflows
       FROM app_applications WHERE id = $1`,
      [applicationIds[2]],
    );
    expect(state.rows[0]).toEqual({
      reference: null,
      status: "draft",
      workflows: 0,
    });
  });

  it("projects dashboard metrics from persisted, access-scoped records", async () => {
    const all = await readAdminDashboard({
      actorId: ownerId,
      since: new Date("2026-01-01T00:00:00.000Z"),
      visibility: "all",
    });
    expect(all.metrics).toEqual({
      pendingDecision: 0,
      totalApplications: 1,
      underReview: 0,
    });
    expect(all.statuses).toEqual([{ count: 1, label: "Initial review" }]);
    expect(all.activities).toMatchObject([
      {
        actorName: "Submission Owner",
        applicationReference: expect.stringMatching(/^SMEF-\d{4}-\d{6}$/),
        eventCode: "APPLICATION_SUBMITTED",
      },
    ]);
    const assigned = await readAdminDashboard({
      actorId: ownerId,
      since: null,
      visibility: "assigned",
    });
    expect(assigned.metrics.totalApplications).toBe(1);
    const hidden = await readAdminDashboard({
      actorId: ownerId,
      since: null,
      visibility: "none",
    });
    expect(hidden.metrics.totalApplications).toBe(0);
  });
});
