INSERT INTO app_capabilities (code, description)
VALUES (
  'workflow.instance.assigned.read',
  'Read workflow progress through an assigned task after task access and conflict of interest checks'
)
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
-- Existing reviewer roles gain only progress for instances containing their tasks.
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT existing.role_id, progress.id
FROM app_role_capabilities existing
JOIN app_capabilities task_read ON task_read.id = existing.capability_id
CROSS JOIN app_capabilities progress
WHERE task_read.code = 'workflow.task.assigned.read'
  AND progress.code = 'workflow.instance.assigned.read'
ON CONFLICT (role_id, capability_id) DO NOTHING;
