-- One-time repair for active, role-assigned workflow tasks created before
-- automatic allocation. Safe to rerun: only pending tasks without an owner match.
-- Run with psql -v ON_ERROR_STOP=1 -f this-file.
BEGIN;
LOCK TABLE app_workflow_tasks IN SHARE ROW EXCLUSIVE MODE;

DO $backfill$
DECLARE
  pending_task record;
  selected_user_id uuid;
  audit_actor_id uuid;
  correlation_id uuid;
  assigned_count integer := 0;
BEGIN
  FOR pending_task IN
    SELECT task.id, task.stage_instance_id,
      task.workflow_task_definition_id, task.assigned_role_id,
      task.row_version, stage.workflow_instance_id,
      application.owner_user_id, definition.code AS task_code,
      definition.permissions
    FROM app_workflow_tasks task
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application
      ON application.id = workflow.application_id
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    WHERE task.status = 'PENDING'
      AND task.assigned_user_id IS NULL
      AND task.assigned_role_id IS NOT NULL
      AND stage.status = 'ACTIVE'
      AND workflow.status = 'ACTIVE'
    ORDER BY task.stage_instance_id,
      task.workflow_task_definition_id, task.reviewer_slot, task.id
  LOOP
    SELECT candidate.id INTO selected_user_id
    FROM app_users candidate
    JOIN app_user_roles membership
      ON membership.user_id = candidate.id
      AND membership.role_id = pending_task.assigned_role_id
    WHERE candidate.status = 'active'
      AND candidate.id <> pending_task.owner_user_id
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks sibling
        WHERE sibling.stage_instance_id = pending_task.stage_instance_id
          AND sibling.workflow_task_definition_id =
            pending_task.workflow_task_definition_id
          AND sibling.id <> pending_task.id
          AND sibling.assigned_user_id = candidate.id
          AND sibling.status <> 'CANCELLED'
      )
      AND NOT EXISTS (
        SELECT 1 FROM (
          VALUES (pending_task.permissions ->> 'view'),
            (pending_task.permissions ->> 'edit'),
            (pending_task.permissions ->> 'decide')
        ) required(code)
        WHERE required.code IS NULL OR NOT EXISTS (
          SELECT 1 FROM app_user_roles granted_role
          JOIN app_role_capabilities grant_record
            ON grant_record.role_id = granted_role.role_id
          JOIN app_capabilities permission
            ON permission.id = grant_record.capability_id
          WHERE granted_role.user_id = candidate.id
            AND permission.code = required.code
        )
      )
    ORDER BY (
      SELECT count(*)
      FROM app_workflow_tasks owned
      WHERE owned.assigned_user_id = candidate.id
        AND owned.status IN ('CLAIMED', 'IN_PROGRESS')
    ), candidate.id
    LIMIT 1;

    IF selected_user_id IS NULL THEN
      RAISE EXCEPTION
        'Cannot backfill task %: no eligible reviewer for %',
        pending_task.id, pending_task.task_code;
    END IF;

    SELECT audit.actor_id INTO audit_actor_id
    FROM app_workflow_audit_entries audit
    WHERE audit.task_id = pending_task.id
      AND audit.action = 'TASK_CREATED'
    ORDER BY audit.runtime_sequence
    LIMIT 1;
    IF audit_actor_id IS NULL THEN
      RAISE EXCEPTION
        'Cannot backfill task %: creation audit is missing',
        pending_task.id;
    END IF;

    correlation_id := gen_random_uuid();
    UPDATE app_workflow_tasks
    SET assigned_user_id = selected_user_id,
      assigned_role_id = NULL,
      claimed_at = clock_timestamp(),
      status = 'CLAIMED',
      row_version = row_version + 1
    WHERE id = pending_task.id
      AND status = 'PENDING'
      AND assigned_user_id IS NULL
      AND row_version = pending_task.row_version;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Task % changed during backfill', pending_task.id;
    END IF;

    INSERT INTO app_workflow_audit_entries (
      actor_id, action, target_type, target_id, correlation_id,
      workflow_instance_id, stage_instance_id, task_id,
      reason, before, after
    ) VALUES (
      audit_actor_id, 'TASK_ASSIGNED', 'WORKFLOW_TASK',
      pending_task.id::text, correlation_id,
      pending_task.workflow_instance_id, pending_task.stage_instance_id,
      pending_task.id, 'One-time automatic assignment backfill',
      jsonb_build_object(
        'assignedRoleId', pending_task.assigned_role_id,
        'assignedUserId', NULL,
        'rowVersion', pending_task.row_version,
        'status', 'PENDING'
      ),
      jsonb_build_object(
        'assignedRoleId', NULL,
        'assignedUserId', selected_user_id,
        'rowVersion', pending_task.row_version + 1,
        'status', 'CLAIMED'
      )
    );
    INSERT INTO app_workflow_events (
      workflow_instance_id, event_code, actor_id, correlation_id, payload
    ) VALUES (
      pending_task.workflow_instance_id, 'TASK_ASSIGNED',
      audit_actor_id, correlation_id,
      jsonb_build_object(
        'taskId', pending_task.id,
        'assignedUserId', selected_user_id,
        'source', 'one-time-backfill'
      )
    );
    assigned_count := assigned_count + 1;
  END LOOP;
  RAISE NOTICE 'Automatically assigned % existing workflow tasks', assigned_count;
END;
$backfill$;
COMMIT;
