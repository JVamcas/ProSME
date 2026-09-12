INSERT INTO "app_roles" ("code", "name", "description") VALUES
  ('cms_publisher', 'CMS Publisher', 'Reviews and publishes approved editorial content')
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description";
--> statement-breakpoint
WITH resource_actions(resource, actions) AS (
  VALUES
    ('pages', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('news', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('resources', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('events', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('faqs', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('funding-calls', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('eligibility', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('statistics', ARRAY['read', 'create', 'update', 'publish', 'delete']),
    ('media', ARRAY['read', 'create', 'update', 'delete']),
    ('site-settings', ARRAY['read', 'update', 'publish']),
    ('engagement-submissions', ARRAY['read', 'update', 'delete'])
), permission_codes AS (
  SELECT 'cms.' || resource || '.' || action AS code
  FROM resource_actions
  CROSS JOIN LATERAL unnest(actions) AS action
), all_permissions AS (
  SELECT code FROM permission_codes
  UNION ALL SELECT 'cms.principals.manage'
  UNION ALL SELECT 'cms.audit.read'
)
INSERT INTO "app_capabilities" ("code", "description")
SELECT code, 'Phase 2 granular CMS permission: ' || code FROM all_permissions
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
DELETE FROM "app_role_capabilities" role_permission
USING "app_roles" role_row, "app_capabilities" capability_row
WHERE role_permission."role_id" = role_row."id"
  AND role_permission."capability_id" = capability_row."id"
  AND role_row."code" IN ('cms_editor', 'cms_publisher', 'programme_administrator', 'system_administrator')
  AND capability_row."code" IN ('content.create', 'content.update', 'content.publish', 'content.delete');
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" = 'cms_editor' AND (
    capability_row."code" = 'cms.access'
    OR capability_row."code" ~ '^cms\.(pages|news|resources|events|faqs|media)\.(read|create|update)$'
    OR capability_row."code" ~ '^cms\.site-settings\.(read|update)$'
  ))
  OR (role_row."code" = 'cms_publisher' AND (
    capability_row."code" IN ('cms.access', 'cms.audit.read')
    OR capability_row."code" ~ '^cms\.(pages|news|resources|events|faqs)\.(read|create|update|publish)$'
    OR capability_row."code" ~ '^cms\.media\.(read|create|update)$'
    OR capability_row."code" ~ '^cms\.site-settings\.(read|update|publish)$'
  ))
  OR (role_row."code" = 'programme_administrator' AND (
    capability_row."code" IN ('admin.access', 'cms.access', 'cms.audit.read')
    OR capability_row."code" ~ '^cms\.(funding-calls|eligibility|statistics)\.(read|create|update|publish|delete)$'
    OR capability_row."code" ~ '^cms\.media\.(read|create|update|delete)$'
    OR capability_row."code" ~ '^cms\.engagement-submissions\.(read|update|delete)$'
  ))
  OR (role_row."code" = 'system_administrator' AND (
    capability_row."code" = 'admin.access'
    OR capability_row."code" LIKE 'cms.%'
  ))
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
