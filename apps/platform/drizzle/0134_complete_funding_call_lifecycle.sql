INSERT INTO app_capabilities (code, description) VALUES
  ('funding.call.suspend', 'Suspend a Scheduled or Live funding call with a reason.'),
  ('funding.call.resume', 'Resume a suspended funding call according to its effective dates.'),
  ('funding.call.withdraw', 'Permanently withdraw a published funding call with a reason.'),
  ('funding.call.archive', 'Archive a Closed or Withdrawn funding call.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT existing.role_id, lifecycle_permission.id
FROM app_role_capabilities existing
JOIN app_capabilities publish_permission
  ON publish_permission.id = existing.capability_id
CROSS JOIN app_capabilities lifecycle_permission
WHERE publish_permission.code = 'funding.call.publish'
  AND lifecycle_permission.code IN (
    'funding.call.suspend',
    'funding.call.resume',
    'funding.call.withdraw',
    'funding.call.archive'
  )
ON CONFLICT (role_id, capability_id) DO NOTHING;
