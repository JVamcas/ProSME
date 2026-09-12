UPDATE "app_roles"
SET "name" = CASE "code"
  WHEN 'cms_administrator' THEN 'Administrator'
  WHEN 'cms_editor' THEN 'Editor'
  WHEN 'cms_author' THEN 'Author'
  WHEN 'cms_reviewer' THEN 'Reviewer'
  ELSE "name"
END
WHERE "code" IN (
  'cms_administrator',
  'cms_editor',
  'cms_author',
  'cms_reviewer'
);
