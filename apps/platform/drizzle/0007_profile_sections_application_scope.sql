ALTER TABLE "app_applicant_profiles"
  ADD COLUMN IF NOT EXISTS "position" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "app_applicant_profiles"
  ALTER COLUMN "first_name" SET DEFAULT '',
  ALTER COLUMN "surname" SET DEFAULT '',
  ALTER COLUMN "position" SET DEFAULT '',
  ALTER COLUMN "phone_number" SET DEFAULT '',
  ALTER COLUMN "region" SET DEFAULT '';
--> statement-breakpoint
INSERT INTO "app_capabilities" ("code", "description") VALUES
  ('application.read.assigned', 'Read applications connected to an assigned task'),
  ('application.read.all', 'Read all applications in the permitted programme scope')
ON CONFLICT ("code") DO UPDATE SET "description" = EXCLUDED."description";
--> statement-breakpoint
INSERT INTO "app_role_capabilities" ("role_id", "capability_id")
SELECT role_row."id", capability_row."id"
FROM "app_roles" role_row
CROSS JOIN "app_capabilities" capability_row
WHERE
  (role_row."code" IN ('programme_officer', 'approval_panel_member', 'system_administrator')
    AND capability_row."code" = 'application.read.all')
  OR
  (role_row."code" IN (
    'programme_officer',
    'sector_specialist',
    'finance_officer',
    'approval_panel_member',
    'system_administrator'
  ) AND capability_row."code" = 'application.read.assigned')
ON CONFLICT ("role_id", "capability_id") DO NOTHING;
