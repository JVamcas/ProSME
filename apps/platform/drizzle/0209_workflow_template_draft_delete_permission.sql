INSERT INTO app_capabilities (code, description)
VALUES (
  'workflow.definition.draft.delete.all',
  'Delete any unreferenced workflow template whose versions are all drafts.'
)
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT existing.role_id, deletion.id
FROM app_role_capabilities existing
JOIN app_capabilities editing
  ON editing.id = existing.capability_id
  AND editing.code = 'workflow.definition.update'
JOIN app_capabilities deletion
  ON deletion.code = 'workflow.definition.draft.delete.all'
ON CONFLICT (role_id, capability_id) DO NOTHING;
