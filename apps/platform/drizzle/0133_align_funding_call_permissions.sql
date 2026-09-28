INSERT INTO app_capabilities (code, description)
VALUES (
  'funding.call.edit-draft',
  'Edit draft funding calls and resubmit drafts returned for amendment.'
)
ON CONFLICT (code) DO UPDATE
SET description = EXCLUDED.description;
--> statement-breakpoint
WITH permission_mapping(old_code, new_code) AS (
  VALUES
    ('funding.call.update', 'funding.call.edit-draft'),
    ('funding.call.submit.all', 'funding.call.create'),
    ('funding.call.return.all', 'funding.call.approve.all')
)
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT legacy_grant.role_id, replacement.id
FROM permission_mapping
JOIN app_capabilities legacy
  ON legacy.code = permission_mapping.old_code
JOIN app_role_capabilities legacy_grant
  ON legacy_grant.capability_id = legacy.id
JOIN app_capabilities replacement
  ON replacement.code = permission_mapping.new_code
ON CONFLICT (role_id, capability_id) DO NOTHING;
--> statement-breakpoint
DELETE FROM app_role_capabilities grant_row
USING app_capabilities capability
WHERE grant_row.capability_id = capability.id
  AND capability.code IN (
    'funding.call.update',
    'funding.call.submit.all',
    'funding.call.return.all'
  );
--> statement-breakpoint
DELETE FROM app_capabilities
WHERE code IN (
  'funding.call.update',
  'funding.call.submit.all',
  'funding.call.return.all'
);
--> statement-breakpoint
UPDATE app_capabilities
SET description = 'Create draft funding calls and submit them for approval.'
WHERE code = 'funding.call.create';
--> statement-breakpoint
UPDATE app_capabilities
SET description = 'Approve or return pending funding calls subject to maker-checker policy.'
WHERE code = 'funding.call.approve.all';
