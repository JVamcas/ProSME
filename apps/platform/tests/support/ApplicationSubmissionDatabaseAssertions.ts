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
