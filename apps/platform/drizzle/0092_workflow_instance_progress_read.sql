INSERT INTO app_capabilities (code, description)
VALUES (
  'workflow.instance.all.read',
  'Read internal stage and task progress for any submitted application'
)
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT role_row.id, capability_row.id
FROM app_roles role_row
JOIN app_capabilities capability_row
  ON capability_row.code = 'workflow.instance.all.read'
WHERE role_row.code = 'system_administrator'
ON CONFLICT (role_id, capability_id) DO NOTHING;
