CREATE TABLE app_branding_settings (
  key text PRIMARY KEY,
  logo_content_type text NOT NULL,
  logo_file_name text NOT NULL,
  logo_object_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text NOT NULL,
  CONSTRAINT app_branding_settings_key_check CHECK (key = 'default'),
  CONSTRAINT app_branding_settings_object_key_check
    CHECK (
      logo_object_key LIKE 'dev/utilities/brand/%'
      OR logo_object_key LIKE 'prod/utilities/brand/%'
    )
);
--> statement-breakpoint
INSERT INTO app_capabilities (code, description)
VALUES
  ('branding.read', 'Read platform branding settings.'),
  ('branding.manage', 'Upload and replace platform branding assets.')
ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description;
--> statement-breakpoint
INSERT INTO app_role_capabilities (role_id, capability_id)
SELECT DISTINCT existing.role_id, branding_permission.id
FROM app_role_capabilities existing
JOIN app_capabilities notification_permission
  ON notification_permission.id = existing.capability_id
  AND notification_permission.code = 'notifications.configuration.update'
CROSS JOIN app_capabilities branding_permission
WHERE branding_permission.code IN ('branding.read', 'branding.manage')
ON CONFLICT (role_id, capability_id) DO NOTHING;
