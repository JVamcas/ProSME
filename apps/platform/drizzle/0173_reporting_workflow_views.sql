-- v1 projections freeze exact-version joins and pause accounting.
CREATE OR REPLACE VIEW app_reporting_dataset_workflow_stages_v1
WITH (security_barrier = true) AS
SELECT application.id AS application_id, application.reference,
  call.id AS funding_call_id, call.title AS funding_call_title,
  workflow.id AS workflow_instance_id, workflow.workflow_template_version_id,
  workflow.status AS workflow_status, stage.id AS stage_instance_id,
  definition.code AS stage_code, definition.name AS stage_name,
  stage.iteration_number, stage.status AS stage_status,
  stage.activated_at, stage.completed_at, bounds.run_at,
  greatest(extract(epoch FROM bounds.end_at - stage.activated_at) / 3600, 0)::numeric AS gross_elapsed_hours,
  pause.paused_hours,
  greatest(extract(epoch FROM bounds.end_at - stage.activated_at) / 3600 - pause.paused_hours, 0)::numeric AS active_elapsed_hours
FROM app_workflow_instances workflow
JOIN app_applications application ON application.id = workflow.application_id
JOIN app_funding_calls call ON call.id = application.funding_opportunity_id
JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id
JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
  AND definition.version_id = workflow.workflow_template_version_id
CROSS JOIN LATERAL (
  SELECT nullif(current_setting('app.reporting_run_at', true), '')::timestamptz AS run_at,
    least(coalesce(stage.completed_at, 'infinity'::timestamptz),
      nullif(current_setting('app.reporting_run_at', true), '')::timestamptz) AS end_at
) bounds
LEFT JOIN LATERAL (
  SELECT coalesce(sum(extract(epoch FROM upper(merged.period) - lower(merged.period))) / 3600, 0)::numeric AS paused_hours
  FROM unnest((
    SELECT range_agg(tstzrange(greatest(period.started_at, stage.activated_at),
      least(period.ended_at, bounds.end_at), '[)'))
    FROM (
      SELECT hold.held_at AS started_at, coalesce(hold.resumed_at, bounds.end_at) AS ended_at
      FROM app_workflow_holds hold
      WHERE hold.workflow_instance_id = workflow.id AND (hold.scope = 'APPLICATION' OR (hold.scope = 'STAGE' AND hold.stage_instance_id = stage.id))
      UNION ALL
      SELECT rfi.created_at,
        coalesce(rfi.continuation_applied_at, least(rfi.deadline_at, bounds.end_at))
      FROM app_workflow_rfis rfi WHERE rfi.stage_instance_id = stage.id
      UNION ALL
      SELECT deferral.deferred_at, coalesce(deferral.resumed_at, bounds.end_at)
      FROM app_workflow_deferrals deferral WHERE deferral.stage_instance_id = stage.id
    ) period
    WHERE greatest(period.started_at, stage.activated_at) < least(period.ended_at, bounds.end_at)
  )) merged(period)
) pause ON true
WHERE app_reporting_dataset_authorized('workflow-operations')
  AND application.deleted_at IS NULL AND application.submitted_at IS NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE VIEW app_reporting_dataset_workflow_tasks_v1
WITH (security_barrier = true) AS
SELECT application.id AS application_id, application.reference,
  call.id AS funding_call_id, call.title AS funding_call_title,
  workflow.id AS workflow_instance_id, workflow.workflow_template_version_id,
  stage.id AS stage_instance_id, stage.iteration_number,
  definition.code AS stage_code, definition.name AS stage_name,
  task.id AS task_id, task.workflow_task_definition_id AS task_definition_id,
  task.form_version_id, task.status AS task_status,
  task.assigned_user_id, assignee.display_name AS assigned_user_name,
  completion.actor_id AS completing_user_id, completer.display_name AS completing_user_name,
  task.created_at, task.started_at, task.completed_at, task.due_at,
  bounds.run_at,
  task.due_at + pause.paused_hours * interval '1 hour' AS effective_due_at,
  greatest(extract(epoch FROM bounds.end_at - task.created_at) / 3600, 0)::numeric AS gross_elapsed_hours,
  pause.paused_hours,
  greatest(extract(epoch FROM bounds.end_at - task.created_at) / 3600 - pause.paused_hours, 0)::numeric AS active_elapsed_hours
FROM app_workflow_instances workflow
JOIN app_applications application ON application.id = workflow.application_id
JOIN app_funding_calls call ON call.id = application.funding_opportunity_id
JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = workflow.id
JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
  AND definition.version_id = workflow.workflow_template_version_id
JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
JOIN app_stage_task_definitions task_definition ON task_definition.id = task.workflow_task_definition_id
  AND task_definition.stage_id = stage.workflow_stage_definition_id
LEFT JOIN app_users assignee ON assignee.id = task.assigned_user_id
LEFT JOIN LATERAL (
  SELECT command.actor_id FROM app_task_completion_commands command
  WHERE command.task_instance_id = task.id AND command.result->>'taskStatus' = 'COMPLETED'
    AND command.completed_at = task.completed_at
  ORDER BY command.row_version DESC, command.idempotency_key LIMIT 1
) completion ON true
LEFT JOIN app_users completer ON completer.id = completion.actor_id
CROSS JOIN LATERAL (
  SELECT nullif(current_setting('app.reporting_run_at', true), '')::timestamptz AS run_at,
    least(coalesce(task.completed_at, 'infinity'::timestamptz),
      nullif(current_setting('app.reporting_run_at', true), '')::timestamptz) AS end_at
) bounds
LEFT JOIN LATERAL (
  SELECT coalesce(sum(extract(epoch FROM upper(merged.period) - lower(merged.period))) / 3600, 0)::numeric AS paused_hours
  FROM unnest((
    SELECT range_agg(tstzrange(greatest(period.started_at, task.created_at),
      least(period.ended_at, bounds.end_at), '[)'))
    FROM (
      SELECT hold.held_at AS started_at, coalesce(hold.resumed_at, bounds.end_at) AS ended_at
      FROM app_workflow_holds hold
      WHERE hold.workflow_instance_id = workflow.id AND ((hold.scope = 'TASK' AND hold.task_id = task.id) OR (hold.scope = 'STAGE' AND hold.stage_instance_id = task.stage_instance_id) OR (hold.scope = 'APPLICATION' AND hold.workflow_instance_id = workflow.id))
      UNION ALL
      SELECT rfi.created_at,
        coalesce(rfi.continuation_applied_at, least(rfi.deadline_at, bounds.end_at))
      FROM app_workflow_rfis rfi WHERE rfi.task_id = task.id
      UNION ALL
      SELECT deferral.deferred_at, coalesce(deferral.resumed_at, bounds.end_at)
      FROM app_workflow_deferrals deferral WHERE deferral.stage_instance_id = stage.id
    ) period
    WHERE greatest(period.started_at, task.created_at) < least(period.ended_at, bounds.end_at)
  )) merged(period)
) pause ON true
WHERE app_reporting_dataset_authorized('workflow-operations')
  AND application.deleted_at IS NULL AND application.submitted_at IS NOT NULL;
--> statement-breakpoint
-- Approval candidates expose evidence for the agreed terminal approval commitment rule.
CREATE OR REPLACE VIEW app_reporting_dataset_workflow_approvals_v1
WITH (security_barrier = true) AS
SELECT application.id AS application_id, application.reference,
  application.status AS lifecycle_status,
  call.id AS funding_call_id, call.title AS funding_call_title,
  call.total_budget_envelope, workflow.id AS workflow_instance_id,
  workflow.status AS workflow_status, workflow.terminal_outcome,
  stage.id AS stage_instance_id, stage.iteration_number,
  decision.id AS decision_id, decision.outcome, decision.decided_at,
  decision.task_id, response.form_version_id,
  (response.values->>'APPROVED_AMOUNT')::numeric(18,2) AS approved_amount,
  response.id IS NOT NULL AND response.values->>'APPROVED_AMOUNT' IS NOT NULL AS amount_captured
FROM app_workflow_decisions decision
JOIN app_workflow_instances workflow ON workflow.id = decision.workflow_instance_id
JOIN app_applications application ON application.id = workflow.application_id
JOIN app_funding_calls call ON call.id = application.funding_opportunity_id
JOIN app_workflow_stage_instances stage ON stage.id = decision.source_stage_instance_id
  AND stage.workflow_instance_id = workflow.id
JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
  AND definition.version_id = workflow.workflow_template_version_id
JOIN app_workflow_tasks task ON task.id = decision.task_id AND task.stage_instance_id = stage.id
LEFT JOIN app_form_responses response ON response.workflow_task_id = task.id
  AND response.form_version_id = task.form_version_id AND response.status = 'COMPLETED'
  AND response.definition_snapshot->>'versionId' = response.form_version_id::text
  AND response.respondent_user_id = decision.actor_id
LEFT JOIN app_form_versions version ON version.id = response.form_version_id
LEFT JOIN app_form_definitions form ON form.id = version.form_definition_id
WHERE app_reporting_dataset_authorized('workflow-operations')
  AND application.deleted_at IS NULL AND application.submitted_at IS NOT NULL
  AND definition.code = 'APPROVAL_AWARD_DECISION'
  AND (form.code = 'APPROVAL' OR response.id IS NULL);
--> statement-breakpoint
-- Agreed rule: latest award decision, terminal APPROVED, excluding withdrawals.
CREATE OR REPLACE VIEW app_reporting_dataset_effective_awards_v1
WITH (security_barrier = true) AS
WITH latest AS (
  SELECT candidate.*,
    row_number() OVER (PARTITION BY candidate.application_id
      ORDER BY candidate.decided_at DESC, candidate.decision_id DESC) AS decision_rank
  FROM app_reporting_dataset_workflow_approvals_v1 candidate
  WHERE candidate.decided_at <= nullif(current_setting('app.reporting_run_at', true), '')::timestamptz
)
SELECT application_id, reference, funding_call_id, funding_call_title,
  workflow_instance_id, decision_id, decided_at, form_version_id,
  approved_amount, amount_captured
FROM latest
WHERE decision_rank = 1 AND outcome = 'APPROVED'
  AND workflow_status = 'COMPLETED' AND terminal_outcome = 'APPROVED'
  AND lifecycle_status = 'submitted';
--> statement-breakpoint
CREATE OR REPLACE VIEW app_reporting_dataset_call_commitments_v1
WITH (security_barrier = true) AS
SELECT call.id AS funding_call_id, call.title AS funding_call_title,
  call.total_budget_envelope,
  count(award.application_id)::integer AS approved_applications,
  count(award.application_id) FILTER (WHERE NOT award.amount_captured)::integer AS missing_amounts,
  CASE WHEN count(award.application_id) FILTER (WHERE NOT award.amount_captured) = 0
    THEN coalesce(sum(award.approved_amount), 0)::numeric(18,2) END AS effective_committed_amount,
  CASE WHEN count(award.application_id) FILTER (WHERE NOT award.amount_captured) = 0
    THEN (call.total_budget_envelope - coalesce(sum(award.approved_amount), 0))::numeric(18,2) END AS remaining_amount,
  CASE WHEN count(award.application_id) FILTER (WHERE NOT award.amount_captured) = 0
    THEN 100 * coalesce(sum(award.approved_amount), 0) / nullif(call.total_budget_envelope, 0) END AS utilisation_percent
FROM app_funding_calls call
LEFT JOIN app_reporting_dataset_effective_awards_v1 award ON award.funding_call_id = call.id
WHERE app_reporting_dataset_authorized('workflow-operations')
GROUP BY call.id, call.title, call.total_budget_envelope;
