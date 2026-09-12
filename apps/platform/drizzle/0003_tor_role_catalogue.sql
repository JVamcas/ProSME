INSERT INTO "app_roles" ("code", "name", "description") VALUES
  ('cms_administrator', 'CMS Administrator', 'Administers CMS content and configuration'),
  ('cms_editor', 'CMS Editor', 'Edits content and manages editorial quality'),
  ('cms_author', 'CMS Author', 'Creates and updates editorial content'),
  ('cms_reviewer', 'CMS Reviewer', 'Reviews and publishes approved editorial content'),
  ('programme_officer', 'Programme Officer', 'Manages programme operations and funding content'),
  ('sector_specialist', 'Sector Specialist', 'Performs sector-specific application assessments'),
  ('approval_panel_member', 'Approval Panel Member', 'Participates in application approval decisions')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "app_user_roles" user_role
    JOIN "app_roles" role_row ON role_row."id" = user_role."role_id"
    WHERE role_row."code" = 'finance_officer'
  ) THEN
    RAISE EXCEPTION 'finance_officer has assigned users and requires an approved TOR role mapping';
  END IF;
END;
$$;
--> statement-breakpoint
WITH role_mapping(old_code, new_code) AS (
  VALUES
    ('cms_publisher', 'cms_reviewer'),
    ('programme_administrator', 'programme_officer'),
    ('technical_assessor', 'sector_specialist'),
    ('committee_member', 'approval_panel_member')
)
INSERT INTO "app_authorization_audit_entries" (
  "actor_id",
  "target_user_id",
  "action",
  "role_code",
  "changes"
)
SELECT
  'migration:0003_tor_role_catalogue',
  user_role."user_id",
  'role.migrated',
  new_role."code",
  jsonb_build_object('from', old_role."code", 'to', new_role."code")
FROM role_mapping
JOIN "app_roles" old_role ON old_role."code" = role_mapping.old_code
JOIN "app_roles" new_role ON new_role."code" = role_mapping.new_code
JOIN "app_user_roles" user_role ON user_role."role_id" = old_role."id";
--> statement-breakpoint
WITH role_mapping(old_code, new_code) AS (
  VALUES
    ('cms_publisher', 'cms_reviewer'),
    ('programme_administrator', 'programme_officer'),
    ('technical_assessor', 'sector_specialist'),
    ('committee_member', 'approval_panel_member')
)
INSERT INTO "app_user_roles" ("user_id", "role_id")
SELECT user_role."user_id", new_role."id"
FROM role_mapping
JOIN "app_roles" old_role ON old_role."code" = role_mapping.old_code
JOIN "app_roles" new_role ON new_role."code" = role_mapping.new_code
JOIN "app_user_roles" user_role ON user_role."role_id" = old_role."id"
ON CONFLICT ("user_id", "role_id") DO NOTHING;
--> statement-breakpoint
DELETE FROM "app_roles"
WHERE "code" IN (
  'cms_publisher',
  'programme_administrator',
  'technical_assessor',
  'finance_officer',
  'committee_member'
);
--> statement-breakpoint
DELETE FROM "app_role_capabilities" role_capability
USING "app_roles" role_row
WHERE role_capability."role_id" = role_row."id"
  AND role_row."code" IN (
    'cms_administrator',
    'cms_editor',
    'cms_author',
    'cms_reviewer',
    'programme_officer',
    'sector_specialist',
    'approval_panel_member'
  );
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" = 'cms_author' AND (
    capability_row."code" = 'cms.access'
    OR capability_row."code" ~ '^cms\.(pages|news|resources|events|faqs)\.(read|create|update)$'
    OR capability_row."code" ~ '^cms\.media\.(read|create)$'
  ))
  OR (role_row."code" = 'cms_editor' AND (
    capability_row."code" = 'cms.access'
    OR capability_row."code" ~ '^cms\.(pages|news|resources|events|faqs)\.(read|create|update)$'
    OR capability_row."code" ~ '^cms\.media\.(read|create|update)$'
    OR capability_row."code" ~ '^cms\.site-settings\.(read|update)$'
  ))
  OR (role_row."code" = 'cms_reviewer' AND (
    capability_row."code" IN ('cms.access', 'cms.audit.read')
    OR capability_row."code" ~ '^cms\.(pages|news|resources|events|faqs)\.(read|update|publish)$'
    OR capability_row."code" = 'cms.media.read'
    OR capability_row."code" ~ '^cms\.site-settings\.(read|publish)$'
  ))
  OR (role_row."code" = 'cms_administrator' AND (
    capability_row."code" LIKE 'cms.%'
    AND capability_row."code" <> 'cms.principals.manage'
  ))
  OR (role_row."code" = 'programme_officer' AND (
    capability_row."code" IN ('admin.access', 'cms.access', 'cms.audit.read')
    OR capability_row."code" ~ '^cms\.(funding-calls|eligibility|statistics)\.(read|create|update|publish|delete)$'
    OR capability_row."code" ~ '^cms\.media\.(read|create|update|delete)$'
    OR capability_row."code" ~ '^cms\.engagement-submissions\.(read|update|delete)$'
  ))
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
