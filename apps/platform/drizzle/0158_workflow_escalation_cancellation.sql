INSERT INTO app_capabilities (code, description)
VALUES ('workflow.escalation.own.cancel',
  'Cancel an active manual escalation initiated by the original assignee and restore their unfinished task assignment')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Existing task processors retain the ability to recall their own escalations.
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT existing.role_id, cancellation.id
FROM app_role_capabilities existing
JOIN app_capabilities processor ON processor.id = existing.capability_id
CROSS JOIN app_capabilities cancellation
WHERE processor.code = 'workflow.task.assigned.process'
  AND cancellation.code = 'workflow.escalation.own.cancel'
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
ALTER TABLE app_workflow_escalations
ADD COLUMN IF NOT EXISTS parent_escalation_id uuid
  REFERENCES app_workflow_escalations(id) ON DELETE RESTRICT;
--> statement-breakpoint
DROP INDEX IF EXISTS app_workflow_escalations_active_task_unique;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_workflow_escalations_active_task_idx
ON app_workflow_escalations(task_id) WHERE status = 'ACTIVE';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS app_workflow_escalations_parent_idx
ON app_workflow_escalations(parent_escalation_id);
