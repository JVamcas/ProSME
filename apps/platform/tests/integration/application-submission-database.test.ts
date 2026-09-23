import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { preflightOwnedApplication } from "@/modules/applications/infrastructure/ApplicationPreflightRepository";
import { submitOwnedApplication } from "@/modules/applications/infrastructure/ApplicationSubmissionRepository";
import { readApplicantDashboard } from "@/db/repositories/ApplicantDashboardRepository";
import { readAdminDashboard } from "@/db/repositories/AdminDashboardRepository";
import {
  eligibilityVersionId,
  installAuthoritativeEligibilityConfiguration,
} from "../support/AuthoritativeEligibilityDatabaseFixture";
import { readAtomicSubmissionCounts } from "../support/ApplicationSubmissionDatabaseAssertions";
import * as workflowBindingFixture from "../support/WorkflowBindingDatabaseFixture";

const { Pool } = pg;
const enabled = process.env.RUN_P3_APPLICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const ownerId = "61111111-1111-4111-8111-111111111111";
const versionId = "62222222-2222-4222-8222-222222222222";
const newerVersionId = "62222222-2222-4222-8222-222222222223";
const definitionId = "63333333-3333-4333-8333-333333333333";
const stageId = "64444444-4444-4444-8444-444444444444";
const taskId = "65555555-5555-4555-8555-555555555555";
const businessId = "68888888-8888-4888-8888-888888888888";
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
beforeAll(async () => {
  if (!enabled) return;
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'submission-owner@example.test', 'Submission Owner', 'applicant', 'active')`,
    [ownerId],
  );
  await query(
    `INSERT INTO app_business_profiles
      (id, user_id, legal_name, registration_number, business_type, sector,
       region, physical_address, established_year, employee_count)
     VALUES ($1, $2, 'Submission Business', 'B-123', 'cc', 'services',
       'Khomas', 'Test', 2024, 3)`,
    [businessId, ownerId],
  );
  await installAuthoritativeEligibilityConfiguration(query, ownerId);
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
  await workflowBindingFixture.insertSubmissionFundingCalls(
    query,
    versionId,
    eligibilityVersionId,
    ownerId,
  );
  await query(
    `INSERT INTO cms_funding_calls
       (id, title, call_status, _status)
     VALUES
       (96101, 'Open dashboard call', 'open', 'published'),
       (96102, 'Draft dashboard call', 'open', 'draft'),
       (96103, 'Closed dashboard call', 'closed', 'published')`,
  );
  await workflowBindingFixture.insertCompleteSubmissionApplications(query, {
    applicationIds,
    businessId,
    eligibilityVersionId,
    ownerId,
  });
});
afterAll(async () => pool?.end());
describeDatabase("P3.4 transactional application submission", () => {
  it("installs runtime, idempotency, event, and outbox records", async () => {
    const records = await query(
      `SELECT
        to_regclass('app_workflow_instances') AS workflow_instances,
        to_regclass('app_application_submission_commands') AS commands,
        to_regclass('app_application_submission_snapshots') AS snapshots,
        to_regclass('app_transactional_outbox') AS outbox,
        to_regclass('app_applications_reference_unique') AS reference_index`,
    );
    expect(records.rows[0]).toEqual({
      commands: "app_application_submission_commands",
      outbox: "app_transactional_outbox",
      reference_index: "app_applications_reference_unique",
      snapshots: "app_application_submission_snapshots",
      workflow_instances: "app_workflow_instances",
    });
  });
  it("pins one published version and creates the initial runtime atomically", async () => {
    const preflight = await preflightOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[0],
    });
    expect(preflight?.ready).toBe(true);
    expect(preflight?.readinessToken).toBeTruthy();
    const command = {
      actorId: ownerId,
      applicationId: applicationIds[0],
      expectedApplicationRowVersion: preflight!.applicationRowVersion,
      finalConfirmation: true as const,
      readinessToken: preflight!.readinessToken!,
    };
    const [first, second] = await Promise.all([
      submitOwnedApplication({
        ...command,
        correlationId: "67777777-7777-4777-8777-777777777771",
        idempotencyKey: "concurrent-submission-one",
      }),
      submitOwnedApplication({
        ...command,
        correlationId: "67777777-7777-4777-8777-777777777772",
        idempotencyKey: "concurrent-submission-two",
      }),
    ]);
    expect(first.kind).toBe("submitted");
    expect(second.kind).toBe("submitted");
    if (first.kind !== "submitted" || second.kind !== "submitted") return;
    expect(first.result.reference).toBe(second.result.reference);
    expect(first.result.workflowInstanceId).toBe(second.result.workflowInstanceId);
    expect(first.result.workflowTemplateVersionId).toBe(versionId);

    await workflowBindingFixture.publishNewerWorkflowVersion(query, ownerId, definitionId);

    const counts = await readAtomicSubmissionCounts(query, applicationIds[0]);
    expect(counts).toEqual({
      application_audits: 1,
      audits: 1,
      events: 5,
      eligibility_outcomes: 1,
      outbox: 2,
      pinned_version: versionId,
      runtime_initialized: true,
      snapshots: 1,
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
         SET workflow_template_version_id = $2
         WHERE application_id = $1`,
        [applicationIds[0], newerVersionId],
      ),
    ).rejects.toThrow("workflow instance version pin is immutable");
  });
  it("rejects a missing published assignment without partial writes", async () => {
    const result = await preflightOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[1],
    });
    expect(result?.ready).toBe(false);
    expect(result?.readinessToken).toBeNull();
    expect(result?.blockers).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "INITIAL_WORKFLOW_STAGE_UNAVAILABLE" }),
    ]));
    const application = await query(
      `SELECT status, reference FROM app_applications WHERE id = $1`,
      [applicationIds[1]],
    );
    expect(application.rows[0]).toEqual({ reference: null, status: "draft" });
  });

  it("rolls back the reference and runtime when a later write fails", async () => {
    const preflight = await preflightOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[2],
    });
    expect(preflight?.ready).toBe(true);
    await query(
      `INSERT INTO app_transactional_outbox
        (event_code, aggregate_id, schema_version, payload, correlation_id)
       VALUES ('APPLICATION_SUBMISSION_CONFIRMATION_REQUESTED', $1, 1, '{}', $2)`,
      [applicationIds[2], "67777777-7777-4777-8777-777777777774"],
    );
    await expect(submitOwnedApplication({
      actorId: ownerId,
      applicationId: applicationIds[2],
      expectedApplicationRowVersion: preflight!.applicationRowVersion,
      finalConfirmation: true,
      readinessToken: preflight!.readinessToken!,
      correlationId: "67777777-7777-4777-8777-777777777775",
      idempotencyKey: "forced-rollback",
    })).rejects.toThrow();
    const state = await query(
      `SELECT status, reference,
        (SELECT count(*)::integer FROM app_workflow_instances
          WHERE application_id = $1) AS workflows,
        (SELECT count(*)::integer
          FROM app_authoritative_eligibility_outcomes
          WHERE application_id = $1) AS eligibility_outcomes
       FROM app_applications WHERE id = $1`,
      [applicationIds[2]],
    );
    expect(state.rows[0]).toEqual({
      eligibility_outcomes: 0,
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
    expect(all.activities.find(
      (activity) => activity.eventCode === "APPLICATION_SUBMITTED",
    )).toMatchObject({
        actorName: "Submission Owner",
        applicationReference: expect.stringMatching(/^SMEF-\d{4}-\d{6}$/),
        eventCode: "APPLICATION_SUBMITTED",
    });
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

  it("calculates all applicant dashboard metrics in one projection", async () => {
    const dashboard = await readApplicantDashboard(ownerId);

    expect(dashboard.metrics).toEqual({
      actionRequired: 0,
      applicationsInProgress: 2,
      openFundingOpportunities: 1,
      submittedApplications: 1,
    });
    expect(dashboard.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          applicationId: applicationIds[0],
          applicationReference: expect.stringMatching(/^SMEF-\d{4}-\d{6}$/),
          eventCode: "APPLICATION_SUBMITTED",
          fundingOpportunityTitle: "Submission test application",
        }),
      ]),
    );
  });
});
