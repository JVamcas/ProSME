import { expect } from "vitest";

type DatabaseQuery = (
  text: string,
  values?: unknown[],
) => Promise<{ rows: Record<string, unknown>[] }>;

export async function readAtomicSubmissionCounts(
  query: DatabaseQuery,
  applicationId: string,
) {
  const result = await query(
    `SELECT
      (SELECT count(*)::integer FROM app_workflow_instances
        WHERE application_id = $1) AS workflows,
      (SELECT count(*)::integer FROM app_workflow_stage_instances stage
        JOIN app_workflow_instances workflow
          ON workflow.id = stage.workflow_instance_id
        WHERE workflow.application_id = $1) AS stages,
      (SELECT count(*)::integer FROM app_workflow_tasks task
        JOIN app_workflow_stage_instances stage
          ON stage.id = task.stage_instance_id
        JOIN app_workflow_instances workflow
          ON workflow.id = stage.workflow_instance_id
        WHERE workflow.application_id = $1) AS tasks,
      (SELECT count(*)::integer FROM app_workflow_events event
        JOIN app_workflow_instances workflow
          ON workflow.id = event.workflow_instance_id
        WHERE workflow.application_id = $1) AS events,
      (SELECT count(*)::integer FROM app_workflow_audit_entries
        WHERE target_id = $1::text
          AND action = 'APPLICATION_SUBMITTED') AS audits,
      (SELECT count(*)::integer FROM app_transactional_outbox
        WHERE aggregate_id = $1) AS outbox,
      (SELECT count(*)::integer FROM app_application_submission_snapshots
        WHERE application_id = $1) AS snapshots,
      (SELECT count(*)::integer FROM app_application_audit_entries
        WHERE application_id = $1
          AND action = 'APPLICATION_SUBMITTED') AS application_audits,
      (SELECT count(*)::integer FROM app_authoritative_eligibility_outcomes
        WHERE application_id = $1) AS eligibility_outcomes,
      (SELECT workflow_template_version_id FROM app_workflow_instances
        WHERE application_id = $1) AS pinned_version,
      (SELECT created_at = started_at AND completed_at IS NULL
        AND status = 'ACTIVE' FROM app_workflow_instances
        WHERE application_id = $1) AS runtime_initialized`,
    [applicationId],
  );
  return result.rows[0];
}

export async function expectImmutableSubmissionArtifacts(
  query: DatabaseQuery,
  input: {
    applicationId: string;
    eligibilityVersionId: string;
    ownerId: string;
    reference: string;
    workflowVersionId: string;
  },
) {
  const snapshotResult = await query(
    `SELECT id, schema_version, snapshot_content, integrity_hash,
      encode(digest(convert_to(canonical_content, 'UTF8'), 'sha256'), 'hex')
        AS computed_hash
     FROM app_application_submission_snapshots
     WHERE application_id = $1`,
    [input.applicationId],
  );
  const snapshot = snapshotResult.rows[0];
  expect(snapshot.schema_version).toBe(1);
  expect(snapshot.integrity_hash).toBe(snapshot.computed_hash);
  expect(snapshot.snapshot_content).toMatchObject({
    application: { ownerUserId: input.ownerId, status: "submitted" },
    eligibilityRuleSetVersionId: input.eligibilityVersionId,
    reference: input.reference,
    workflowTemplateVersionId: input.workflowVersionId,
  });
  const eligibility = await query(
    `SELECT context_reference FROM app_authoritative_eligibility_outcomes
     WHERE application_id = $1 AND evaluation_number = 1`,
    [input.applicationId],
  );
  expect(eligibility.rows[0].context_reference).toMatchObject({
    submissionSnapshotId: snapshot.id,
    submissionSnapshotIntegrityHash: snapshot.integrity_hash,
  });
  await expect(query(
    `UPDATE app_application_submission_snapshots
     SET snapshot_content = '{}'::jsonb WHERE id = $1`,
    [snapshot.id],
  )).rejects.toThrow("application submission snapshots are immutable");
}

export async function expectAtomicSubmissionCounts(
  query: DatabaseQuery,
  applicationId: string,
  workflowVersionId: string,
) {
  expect(await readAtomicSubmissionCounts(query, applicationId)).toEqual({
    application_audits: 1,
    audits: 1,
    events: 6,
    eligibility_outcomes: 1,
    outbox: 2,
    pinned_version: workflowVersionId,
    runtime_initialized: true,
    snapshots: 1,
    stages: 1,
    tasks: 1,
    workflows: 1,
  });
  const audit = await query(
    `SELECT action FROM app_application_audit_entries
     WHERE application_id = $1
       AND action IN (
         'APPLICATION_REFERENCE_ALLOCATED',
         'APPLICATION_SNAPSHOT_CREATED',
         'APPLICATION_WORKFLOW_BOOTSTRAPPED'
       )
     ORDER BY action`,
    [applicationId],
  );
  expect(audit.rows.map((row) => row.action)).toEqual([
    "APPLICATION_REFERENCE_ALLOCATED",
    "APPLICATION_SNAPSHOT_CREATED",
    "APPLICATION_WORKFLOW_BOOTSTRAPPED",
  ]);
}
