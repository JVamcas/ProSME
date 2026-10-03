-- Escalation now always transfers responsibility. Preserve the original
-- escalation records and assignment history, including legacy SHARE/RETAIN.
ALTER TABLE app_workflow_action_definitions DISABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
UPDATE app_workflow_action_definitions
SET configuration = configuration || '{"responsibility":"TRANSFER","blockUntilResolved":true,"trigger":"MANUAL"}'::jsonb
WHERE action_type = 'ESCALATE';
--> statement-breakpoint
ALTER TABLE app_workflow_action_definitions ENABLE TRIGGER app_workflow_actions_immutable;
--> statement-breakpoint
-- Process allocations in order because each transfer changes reviewer workload
-- and the distinct-reviewer constraint for subsequent transfers.
DO $$
DECLARE
  item record;
  destination_user uuid;
  destination_role uuid;
  correlation uuid;
  before_assignment jsonb;
  after_assignment jsonb;
BEGIN
  FOR item IN
    SELECT escalation.*, task.assigned_user_id, task.assigned_role_id,
      task.workflow_task_definition_id, task.status AS task_status, definition.permissions,
      workflow.application_id, application.owner_user_id
    FROM app_workflow_escalations escalation
    JOIN app_workflow_tasks task ON task.id = escalation.task_id
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = escalation.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    WHERE escalation.status = 'ACTIVE'
      AND (escalation.responsibility <> 'TRANSFER' OR task.assigned_user_id IS NULL)
      AND task.status IN ('PENDING', 'IN_PROGRESS')
      AND ((escalation.target_type = 'USER'
          AND task.assigned_user_id IS DISTINCT FROM escalation.target_user_id)
        OR (escalation.target_type = 'ROLE'
          AND (task.assigned_role_id IS DISTINCT FROM escalation.target_role_id
            OR task.assigned_user_id IS NULL)))
    ORDER BY escalation.escalated_at, escalation.id
    FOR UPDATE OF task
  LOOP
    destination_user := NULL;
    destination_role := CASE WHEN item.target_type = 'ROLE' THEN item.target_role_id END;
    SELECT candidate.id INTO destination_user
    FROM app_users candidate
    LEFT JOIN app_workflow_tasks owned ON owned.assigned_user_id = candidate.id
      AND owned.status IN ('PENDING', 'IN_PROGRESS')
    WHERE candidate.status = 'active'
      AND candidate.id IS DISTINCT FROM item.assigned_user_id
      AND candidate.id <> item.owner_user_id
      AND ((item.target_type = 'USER' AND candidate.id = item.target_user_id)
        OR (item.target_type = 'ROLE' AND EXISTS (
          SELECT 1 FROM app_user_roles membership
          WHERE membership.user_id = candidate.id
            AND membership.role_id = item.target_role_id
        )))
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_tasks peer
        WHERE peer.stage_instance_id = item.stage_instance_id
          AND peer.workflow_task_definition_id = item.workflow_task_definition_id
          AND peer.status <> 'CANCELLED'
          AND peer.assigned_user_id = candidate.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_application_coi clearance
        WHERE clearance.application_id = item.application_id
          AND clearance.user_id = candidate.id
          AND clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
      )
      AND NOT EXISTS (
        SELECT 1 FROM (VALUES (item.permissions ->> 'view'),
          (item.permissions ->> 'edit'), (item.permissions ->> 'decide')) required(code)
        WHERE required.code IS NULL OR NOT EXISTS (
          SELECT 1 FROM app_user_roles granted_role
          JOIN app_role_capabilities grant_record ON grant_record.role_id = granted_role.role_id
          JOIN app_capabilities permission ON permission.id = grant_record.capability_id
          WHERE granted_role.user_id = candidate.id AND permission.code = required.code
        )
      )
    GROUP BY candidate.id
    ORDER BY count(owned.id), candidate.id
    LIMIT 1;
    IF destination_user IS NULL THEN
      RAISE EXCEPTION 'No eligible transfer assignee for active escalation %', item.id;
    END IF;
    correlation := gen_random_uuid();
    before_assignment := jsonb_build_object(
      'assignedUserId', item.assigned_user_id, 'assignedRoleId', item.assigned_role_id,
      'status', item.task_status
    );
    after_assignment := jsonb_build_object(
      'assignedUserId', destination_user, 'assignedRoleId', destination_role,
      'escalationId', item.id, 'assignmentStatus', 'REASSIGNED', 'status', 'PENDING'
    );
    UPDATE app_workflow_tasks SET assigned_user_id = destination_user,
      assigned_role_id = destination_role, claimed_at = now(),
      status = 'PENDING', started_at = NULL, completed_at = NULL, row_version = row_version + 1
    WHERE id = item.task_id;
    UPDATE app_workflow_stage_instances SET row_version = row_version + 1
    WHERE id = item.stage_instance_id;
    INSERT INTO app_workflow_events (workflow_instance_id, event_code, actor_id, correlation_id, payload)
    VALUES (item.workflow_instance_id, 'TASK_REASSIGNED', item.escalated_by, correlation, after_assignment);
    INSERT INTO app_workflow_audit_entries (
      actor_id, action, target_type, target_id, correlation_id,
      workflow_instance_id, stage_instance_id, task_id, before, after, reason
    ) VALUES (
      item.escalated_by, 'TASK_REASSIGNED', 'WORKFLOW_TASK', item.task_id::text, correlation,
      item.workflow_instance_id, item.stage_instance_id, item.task_id,
      before_assignment, after_assignment, 'Escalation responsibility migrated to transfer.'
    );
  END LOOP;
END $$;
