INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE role_row."code" = 'cms_reviewer'
  AND capability_row."code" = 'cms.site-settings.update'
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
